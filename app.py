"""Flask API for browsing events and managing event registrations.

Configure SUPABASE_URL and SUPABASE_KEY in .env. Private routes require a
Supabase Auth access token in Authorization: Bearer <token>.
"""
import os
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from supabase import Client, create_client

load_dotenv()
app = Flask(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client | None = (
    create_client(SUPABASE_URL, SUPABASE_KEY)
    if SUPABASE_URL and SUPABASE_KEY else None
)


def db_client() -> Client:
    if supabase is None:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be configured")
    return supabase


def user_db_client() -> Client:
    """Use the caller's JWT for database requests so Supabase RLS is enforced."""
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    client.postgrest.auth(g.access_token)
    return client


def error(message: str, status: int):
    return jsonify({"error": message}), status


def require_user(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        scheme, _, token = request.headers.get("Authorization", "").partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            return error("A valid Bearer access token is required.", 401)
        try:
            user = db_client().auth.get_user(token.strip()).user
        except Exception:
            return error("Invalid or expired access token.", 401)
        if user is None:
            return error("Invalid or expired access token.", 401)
        g.user = user
        g.access_token = token.strip()
        return handler(*args, **kwargs)
    return wrapped


def database_error(exc: Exception):
    code = getattr(exc, "code", None)
    if code == "23505":
        return error("You are already registered for this event.", 409)
    if code in ("23503", "PGRST116"):
        return error("The requested record was not found.", 404)
    app.logger.exception("Supabase request failed")
    return error("Database request failed.", 500)


@app.get("/")
def index():
    return jsonify({"name": "Events API", "endpoints": [
        "GET /api/events", "GET /api/events/<id>",
        "POST /api/registrations", "GET /api/me/registrations",
        "GET /api/events/<id>/registrations",
    ]})


@app.get("/api/events")
def list_events():
    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 100)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        return error("limit and offset must be integers.", 400)
    try:
        query = db_client().table("events").select("*")
        search = request.args.get("q", "").strip()
        if search:
            query = query.ilike("title", f"%{search}%")
        result = query.order("starts_at").range(offset, offset + limit - 1).execute()
        return jsonify({"data": result.data, "limit": limit, "offset": offset})
    except Exception as exc:
        return database_error(exc)


@app.get("/api/events/<event_id>")
def get_event(event_id):
    try:
        result = (db_client().table("events").select("*")
                  .eq("id", event_id).maybe_single().execute())
        if result.data is None:
            return error("Event not found.", 404)
        return jsonify({"data": result.data})
    except Exception as exc:
        return database_error(exc)


@app.post("/api/registrations")
@require_user
def create_registration():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error("Request body must be a JSON object.", 400)
    event_id = payload.get("event_id")
    if not event_id:
        return error("event_id is required.", 400)
    try:
        client = user_db_client()
        event = (client.table("events").select("id").eq("id", event_id)
                 .maybe_single().execute())
        if event.data is None:
            return error("Event not found.", 404)
        result = client.table("registrations").insert({
            "event_id": event_id, "user_id": str(g.user.id),
        }).execute()
        return jsonify({"data": result.data[0] if result.data else None}), 201
    except Exception as exc:
        return database_error(exc)


@app.get("/api/me/registrations")
@require_user
def my_registrations():
    try:
        result = (user_db_client().table("registrations").select("*, events(*)")
                  .eq("user_id", str(g.user.id))
                  .order("created_at", desc=True).execute())
        return jsonify({"data": result.data})
    except Exception as exc:
        return database_error(exc)


@app.get("/api/events/<event_id>/registrations")
@require_user
def event_registrations(event_id):
    try:
        client = user_db_client()
        event = (client.table("events").select("id, organizer_id")
                 .eq("id", event_id).maybe_single().execute())
        if event.data is None:
            return error("Event not found.", 404)
        if str(event.data["organizer_id"]) != str(g.user.id):
            return error("Only the event organizer can view attendees.", 403)
        result = (client.table("registrations").select("*, users(id, name, email)")
                  .eq("event_id", event_id).order("created_at").execute())
        return jsonify({"data": result.data})
    except Exception as exc:
        return database_error(exc)


@app.errorhandler(404)
def route_not_found(_exc):
    return error("Route not found.", 404)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)),
            debug=os.getenv("FLASK_DEBUG") == "1")
