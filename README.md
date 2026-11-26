# Velos spaces

Velos is a responsive midnight-themed community chat. Members can join topic spaces, share messages in real time, edit their verified profile, and earn one point for every message they send.

## Run locally

Serve the repository root with a local web server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.

## Supabase setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor to create chat spaces and messages.
2. Run `supabase/profile-points-migration.sql` in SQL Editor to add profile pictures, profile editing, and points.
3. Confirm `config.js` has the Supabase project URL and public publishable/anon key. Never put a `service_role` secret in frontend code.
4. Configure Auth Site URL, redirect URLs, email verification, and SMTP in Supabase.

The profile editor is available from the account avatar after sign-in and email verification. Members can update display name, username, and profile picture. Each successfully inserted chat message adds exactly one point in the database; points cannot be edited by members through the public API. The profile shows the point total. Messages show the sender's profile name, message text, and send time.

Avatar images are kept in a public `avatars` bucket so they can be shown beside public messages; upload/replace/delete is restricted to that member's folder with Storage policies. With no Supabase config the UI shows read-only sample chat.

## Spaces

Artificial intelligence · Careers · Fitness · Investing · Prediction markets · Trading.
