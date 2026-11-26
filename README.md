# Velos community forum

A responsive, dark-blue discussion forum for the Velos tech community. The static frontend includes public discussions, search, topic spaces, sorting, voting, replies, and email/password accounts. Supabase provides persistent shared data and authentication; the browser never handles or stores raw passwords itself.

## Run locally

This is a static site: serve the repository root with any local web server, for example `python3 -m http.server 8000`, then open `http://localhost:8000`. Opening `index.html` directly may prevent browser APIs from working correctly.

## Enable real accounts and shared posts

The repository intentionally does not contain project credentials. Connect a Supabase project to enable cross-user accounts and persistent posts:

1. Create a Supabase project and open its SQL Editor.
2. Run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the tables, signup profile trigger, row-level security policies, and secure vote RPC.
3. In Supabase **Project Settings → API**, copy the Project URL and the public publishable/anon key (never put a `service_role` secret in frontend code).
4. Add those two public values to `config.js`:

   ```js
   window.VELOS_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT.supabase.co",
     supabaseAnonKey: "YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY"
   };
   ```

5. In Supabase **Authentication → URL Configuration**, set the Site URL to your deployed site and add local/deployment callback URLs to the redirect allow list. Configure email confirmation and SMTP according to your launch requirements.
6. Deploy the static files to a host such as GitHub Pages, Netlify, or Cloudflare Pages. The URL and anon key are public browser configuration; database access is guarded by the RLS policies in the SQL schema.

Without project settings the site displays sample conversations in demo mode. Demo mode is deliberately read-only: it does not pretend to create accounts or publish public posts without a backend.

## Included capabilities

- Supabase Auth email/password signup, login, persisted sessions, and logout.
- Public feed with topic filtering, search, latest/popular sorting, and responsive navigation.
- Authenticated post and reply creation; public reading.
- Authenticated up/down voting, one vote per user/post, and server-side atomic score updates.
- Row-level security for profiles, posts, comments, and votes.

This frontend does not include email/password reset, moderation tooling, spam controls, or a full profile editor. Configure rate limits, email delivery, abuse reporting/moderation, and backups in the Supabase project before opening a production community to the public.
