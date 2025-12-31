/*
 * Runtime environment overrides for Quiz Dangal.
 * This file is served statically and lets us provide public Supabase keys
 * without relying on build-time env injection (GitHub Pages, etc.).
 *
 * IMPORTANT: only keep public values here. Service-role keys must NEVER live
 * in client bundles or repos.
 */
window.__QUIZ_DANGAL_ENV__ = Object.assign(
  {},
  window.__QUIZ_DANGAL_ENV__ || {},
  {
    // SECURITY: Do not commit real project values here.
    // For local dev use `.env.local` (VITE_*) or overwrite this file during deployment.
    // This file must only contain PUBLIC values (anon key is public by design, service role key must never be here).
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
    // Add your Web Push VAPID public key here (URL-safe base64, no quotes/spaces)
    // Generate with: npx web-push generate-vapid-keys
    VITE_VAPID_PUBLIC_KEY: '',
    // Enable realtime subscriptions for instant result updates
    VITE_ENABLE_REALTIME: '1'
  }
);

