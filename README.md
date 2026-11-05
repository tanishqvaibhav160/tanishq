# Events API

## Setup

1. Create a virtual environment and install `requirements.txt`.
2. Set `SUPABASE_URL` and `SUPABASE_KEY` in `Backend/.env`. Use the project's publishable/anon key, never a service role or secret key.
3. Run `schema.sql` in the Supabase SQL Editor to create any missing tables and apply the indexes, grants, and RLS policies. It matches the supplied database diagram. It does not rename or migrate columns in a different existing schema.
4. Start with `python app.py` from this directory. The API listens on port 5000 by default.

## React frontend

1. In the sibling `Frontend/` directory, copy `.env.example` to `.env.local`. It only needs `VITE_API_BASE_URL`, set to this API's URL.
2. From `Frontend/`, install dependencies with `npm install`, then start the UI with `npm run dev`.
3. For a deployed frontend, set the API's `CORS_ORIGINS` environment variable on Render to the frontend origin (for example, `https://your-app.pages.dev`).

Private routes require `Authorization: Bearer <Supabase access token>`. The frontend signs users in through Supabase Auth and creates a `users` profile row whose `uuid` equals the Auth user ID.

The API uses `events.event_id` and `events.student_id`, `registrations.student_id`, and `users.uuid`, matching the supplied diagram. `student_id` is the event owner on `events` and the registering student on `registrations`.

## Routes

| Method | Route | Access | Result |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Create an Auth account and student profile |
| POST | `/api/auth/login` | Public | Sign in and return access/refresh tokens |
| POST | `/api/auth/refresh` | Public | Refresh an expired access token |
| GET | `/api/events?limit=50&offset=0&q=text` | Public | Browse events, optionally search titles and paginate |
| GET | `/api/events/<id>` | Public | Event details, or 404 |
| POST | `/api/registrations` | Signed in | JSON `{ "event_id": "<uuid>" }`; creates a registration (201), duplicate returns 409 |
| GET | `/api/me/registrations` | Signed in | Current user's registrations with an `event` object |
| GET | `/api/events/<id>/registrations` | Event owner | Attendee registrations with a `user` profile object (`uuid`, `email`, `role`); other users receive 403 |

Responses use JSON. Errors use `{ "error": "..." }`.

The API reads related event and profile rows separately, so these responses do
not depend on PostgREST relationship embedding being available or cached.
