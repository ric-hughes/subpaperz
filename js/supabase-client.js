/**
 * SubPaperz — Supabase Client
 *
 * Initializes and exports the Supabase client as `db`.
 * This file must be loaded after:
 *   - The Supabase CDN script (@supabase/supabase-js)
 *   - config.js (provides SUPABASE_URL and SUPABASE_ANON_KEY)
 *
 * Usage anywhere in the app:
 *   const { data, error } = await db.from('documents').select('*');
 */

// Guard: ensure the Supabase CDN library loaded
if (typeof supabase === 'undefined') {
  console.error('[SubPaperz] Supabase CDN not loaded. Check script order in HTML.');
}

// Guard: ensure config is loaded
if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.warn('[SubPaperz] Supabase URL not configured. Edit js/config.js before deploying.');
}

const { createClient } = supabase;

/**
 * `db` — the Supabase client instance.
 * Exposes: db.auth, db.from(), db.storage, db.functions, etc.
 */
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist the session in localStorage so users stay logged in
    persistSession: true,
    autoRefreshToken: true,
    // After magic link click, redirect back to the app
    redirectTo: typeof AUTH_REDIRECT_URL !== 'undefined'
      ? AUTH_REDIRECT_URL
      : `${window.location.origin}/app/index.html`,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-app-name': typeof APP_NAME !== 'undefined' ? APP_NAME : 'SubPaperz',
    },
  },
});

// ─── Auth state listener ──────────────────────────────────────
// Fires on sign-in, sign-out, token refresh, etc.
// Can be used to reactively update UI anywhere in the app.
db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear any cached plan data
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('sp_plan');
    }
  }
});
