# Gather Frontend — Event Registration & User Profile

React + Vite frontend for event browsing, user profile switching, and event registration. No sign-in or authentication pages needed: simply select any user from the dropdown menu to inspect their profile and register for events.

## Features

- **User Profile Dropdown**: Select any user from the dropdown menu in the header. Shows user email, role (`Organiser` or `Attendee`), and UUID.
- **Instant Profile View**: Selecting any user automatically opens their profile view, displaying their details, UUID (with copy button), role badge, and registered events.
- **Direct Event Registration**: Register the currently active user for any event with a single click. Duplicate registrations are prevented (409 conflict handled gracefully).
- **Host Tools for Organisers**: If the active user is an event organiser, viewing their event lets them inspect the attendee list with student details.
- **Zero-Friction UX**: No login or password forms required.
- **Vercel-Ready**: Preconfigured with `vercel.json` for seamless deployment.

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Make sure `.env` is configured (or copy `.env.example` to `.env.local`):
   ```env
   VITE_API_BASE_URL=https://tanishq-92t4.onrender.com
   VITE_SUPABASE_URL=https://pbobxwbbuhblxdojekwb.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_gnsPC0X6tmkBDE3YdvjJvw_bHHmFaAH
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Deploying on Vercel

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com):
   - Click **Add New Project** and import your repository.
   - Set **Root Directory** to `Frontend` (or click Edit and select the `Frontend` folder).
   - Framework Preset will automatically detect **Vite**.
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://tanishq-92t4.onrender.com` (or your backend URL)
   - `VITE_SUPABASE_URL`: `https://pbobxwbbuhblxdojekwb.supabase.co`
   - `VITE_SUPABASE_KEY`: `sb_publishable_gnsPC0X6tmkBDE3YdvjJvw_bHHmFaAH`
4. Click **Deploy**.
