# Velos spaces

Velos is a responsive midnight-themed community chat. Members can join topic spaces and share messages in real time. Supabase provides email/password accounts, persistent chat history, profile editing and live message delivery.

## Run locally

Serve the repository root with a local web server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.

## Supabase setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor to create chat spaces and messages.
2. Run `supabase/profile-points-migration.sql` in the SQL Editor for profile pictures, profile editing, and points.
3. Confirm `config.js` has the Supabase project URL and public publishable/anon key. Never put a `service_role` secret in frontend code.
4. Configure Auth Site URL, redirect URLs, email verification, and SMTP in Supabase.
5. Deploy and test signup, email verification, profile edits, chat messages, and real-time updates across two browsers.

Message rows show the sender's profile picture in a small circular avatar next to their name, message, and sent time. Profile edits immediately refresh the current user's messages in the open space; new messages load their latest profile data.

With no Supabase config the UI shows read-only sample chat.

## Spaces

Artificial intelligence · Careers · Fitness · Investing · Prediction markets · Trading.
