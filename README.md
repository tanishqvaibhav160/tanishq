# Events API

## Setup

1. Create a virtual environment and install `requirements.txt`.
2. Set `SUPABASE_URL` and `SUPABASE_KEY` in `Backend/.env`. Use the project's publishable/anon key, never a service role or secret key.
3. For a new Supabase project, run `schema.sql` in the SQL Editor. It defines the `users`, `events`, and `registrations` flow shown in the database diagram. Existing tables are not changed by `CREATE TABLE IF NOT EXISTS`; back up and migrate existing data separately.
4. Start with `python app.py` from this directory. The API listens on port 5000 by default.

Private routes require `Authorization: Bearer <Supabase access token>`. The signup flow must maintain a `users` row whose `uuid` equals the Supabase Auth user ID.

The API uses `events.event_id` and `events.student_id`, `registrations.student_id`, and `users.uuid`, matching the supplied diagram. `student_id` is the event owner on `events` and the registering student on `registrations`.

## Routes

| Method | Route | Access | Result |
|---|---|---|---|
| GET | `/api/events?limit=50&offset=0&q=text` | Public | Browse events, optionally search titles and paginate |
| GET | `/api/events/<id>` | Public | Event details, or 404 |
| POST | `/api/registrations` | Signed in | JSON `{ "event_id": "<uuid>" }`; creates a registration (201), duplicate returns 409 |
| GET | `/api/me/registrations` | Signed in | Current user's registrations with an `event` object |
| GET | `/api/events/<id>/registrations` | Event owner | Attendee registrations with a `user` profile object (`uuid`, `email`, `role`); other users receive 403 |

Responses use JSON. Errors use `{ "error": "..." }`.

The API reads related event and profile rows separately, so these responses do
not depend on PostgREST relationship embedding being available or cached.
