/*
 * Template runtime environment overrides for Quiz Dangal.
 *
 * Copy to `public/env-config.js` for deployments that cannot inject build-time env.
 * IMPORTANT:
 * - Only PUBLIC values belong here.
 * - Never put SUPABASE_SERVICE_ROLE_KEY / VAPID_PRIVATE_KEY in any client-served file.
 */
window.__QUIZ_DANGAL_ENV__ = Object.assign(
  {},
  window.__QUIZ_DANGAL_ENV__ || {},
  {
    VITE_SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    VITE_VAPID_PUBLIC_KEY: 'YOUR_VAPID_PUBLIC_KEY',
    VITE_ENABLE_REALTIME: '1',
  },
);
