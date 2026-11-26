# Velos spaces

Velos is a responsive midnight-themed community chat. Members can join topic spaces and share messages in real time. Supabase provides email/password accounts, persistent chat history, and live message delivery.

## Run locally

Serve the repository root with a local web server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.

## Enable accounts and shared real-time chat

1. Open the Supabase project SQL Editor and run `supabase/schema.sql`. It adds six public spaces, messages, row-level security, and Realtime publication for new messages. The earlier discussion tables are retained.
2. Confirm `config.js` contains your Supabase Project URL and public publishable/anon key. Never put a `service_role` secret in frontend code.
3. In Supabase Authentication settings, set the Site URL and allowed redirect URLs for your deployed site; configure email confirmation and SMTP if required.
4. Deploy the site, then test sign up, sign in, sending a message, switching spaces, and receiving a message from another browser/session.

With no Supabase config the UI shows local sample messages. Sample mode is read-only and does not claim messages are shared.

## Spaces

- Artificial intelligence
- Careers
- Fitness
- Investing
- Prediction markets
- Trading

Messages are public to read; only authenticated members can send them. The SQL policies enforce this in the database. Configure moderation, rate limits, email delivery, backups, and abuse reporting before a public launch.
