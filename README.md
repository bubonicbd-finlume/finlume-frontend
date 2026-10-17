# FinLume Vite project

This is the maintainable Vite version of the existing single-file FinLume app. It preserves the current interface and behavior while moving third-party libraries from browser CDNs into version-locked project dependencies.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Keep the supplied local settings file, or copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
4. Run `npm run dev`.

The `.env.local` file is ignored by Git. Do not commit a service-role key. Only use a Supabase publishable key (or the older public anon key) in a browser app.

## Deploy with GitHub and Netlify

1. Add this project folder to your GitHub repository and commit everything except `.env.local`, `node_modules`, and `dist`.
2. In Netlify, use the included settings: build command `npm run build`, publish directory `dist`.
3. In **Netlify → Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Trigger a new deployment.

The included `netlify.toml` configures the build, long-lived caching for fingerprinted assets, and a single-page-app fallback. The `public/_headers` file adds production security headers.

## Project map

- `src/main.js` loads dependencies, exposes compatibility globals, and starts the app.
- `src/legacy-app.js` contains the existing proven application logic, unchanged apart from environment-based Supabase configuration.
- `src/styles.css` contains the existing visual system without redesigning it.
- `src/legal.js` and `src/accessibility.js` keep supporting features separate.
- `public/` contains the web-app manifest, service worker, and Netlify headers.

## Commands

- `npm run dev` — local development server
- `npm run check` — JavaScript syntax validation
- `npm run build` — optimized production build
- `npm run preview` — preview the production build locally

## Recommended next refactor

After this migration is deployed and confirmed against real Supabase data, split `legacy-app.js` gradually by feature (accounts, transactions, budgets, liabilities, and financial review). Keeping this first migration behavior-compatible reduces deployment risk and gives each later refactor a stable baseline.
