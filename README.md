# Events API

## Setup

1. Create a virtual environment and install `requirements.txt`.
2. Set `SUPABASE_URL` and `SUPABASE_KEY` in `Backend/.env`. Use the project's publishable/anon key, never a service role or secret key.
3. Run `schema.sql` in the Supabase SQL Editor. The app expects the `users`, `events`, and `registrations` tables and the RLS policies in that file.
4. Start with `python app.py` from this directory. The API listens on port 5000 by default.

Private routes require `Authorization: Bearer <Supabase access token>`. `users` profile rows are expected to be maintained by the application's signup flow and have `id` equal to the Auth user ID.

## Routes

| Method | Route | Access | Result |
|---|---|---|---|
| GET | `/api/events?limit=50&offset=0&q=text` | Public | Browse events, optionally search titles and paginate |
| GET | `/api/events/<id>` | Public | Event details, or 404 |
| POST | `/api/registrations` | Signed in | JSON `{ "event_id": "<uuid>" }`; creates a registration (201), duplicate returns 409 |
| GET | `/api/me/registrations` | Signed in | Current user's registrations with event details |
| GET | `/api/events/<id>/registrations` | Owning organizer | Attendee registrations with a `user` profile object (`id`, `name`, `email`); other users receive 403 |

Responses use JSON. Errors use `{ "error": "..." }`.

For the organizer attendee list, the API reads registrations and profile rows
separately. In this schema `registrations.user_id` references Supabase Auth,
not `public.users`, so PostgREST cannot embed the profile table as a relation.
