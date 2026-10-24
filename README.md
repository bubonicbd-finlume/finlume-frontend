# FinLume

FinLume is a React/Vite personal finance application. Finance and Split features run in the browser and save account data through Supabase.

## Local development

1. Use Node.js 20.19 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key. Never place a service-role key in the browser app.
4. Run `npm run dev`.

## Verification

Run `npm run validate` to check source syntax, lazy page dependencies, tests, the production build, and bundled OCR assets.

## Deployment

Netlify uses `netlify.toml` to build with `npm run build` and publish `dist`. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the public anon key) in Netlify environment variables. A commit to the connected branch triggers deployment.

The production app build uses only the publishable client key. Keep `.env.local`, `node_modules`, and `dist` out of Git.
