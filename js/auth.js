/**
 * SubPaperz — Auth Module
 *
 * Requires: supabase-client.js (provides `db`)
 *
 * Exported functions:
 *   checkAuth()               — returns user or null; shows login modal if no session
 *   signInWithMagicLink(email) — sends OTP magic link
 *   signOut()                  — signs out and redirects to marketing page
 *   getUser()                  — returns current user from active session
 */

// ─── Check auth session ───────────────────────────────────────
/**
 * Checks whether there is an active Supabase session.
 * - If authenticated: returns the user object.
 * - If not authenticated and on an /app/* page: shows the login modal overlay
 *   (does NOT navigate away — the modal overlays the shell).
 * - Returns null if not authenticated.
 *
 * @returns {Promise<object|null>} user object or null
 */
async function checkAuth() {
  try {
    // First try to exchange the URL hash token (handles magic link redirects)
    const { data: sessionData, error: sessionError } = await db.auth.getSession();

    if (sessionError) {
      console.error('[Auth] getSession error:', sessionError.message);
      _showLoginModal();
      return null;
    }

    if (sessionData?.session?.user) {
      return sessionData.session.user;
    }

    // No session — show login modal if on app page
    const onAppPage = window.location.pathname.includes('/app/');
    if (onAppPage) {
      _showLoginModal();
    }

    return null;
  } catch (err) {
    console.error('[Auth] Unexpected error in checkAuth:', err);
    _showLoginModal();
    return null;
  }
}

// ─── Sign in with magic link ──────────────────────────────────
/**
 * Sends a magic link to the given email via Supabase Auth OTP.
 *
 * @param {string} email
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
async function signInWithMagicLink(email) {
  if (!email || typeof email !== 'string') {
    return { data: null, error: { message: 'A valid email address is required.' } };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { data: null, error: { message: 'Please enter a valid email address.' } };
  }

  try {
    const { data, error } = await db.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        // Redirect here after clicking the magic link in email
        emailRedirectTo: typeof AUTH_REDIRECT_URL !== 'undefined'
          ? AUTH_REDIRECT_URL
          : `${window.location.origin}/app/index.html`,
        // Create a new account if one doesn't exist
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[Auth] Magic link error:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Auth] signInWithMagicLink exception:', err);
    return { data: null, error: { message: 'Unable to send magic link. Please try again.' } };
  }
}

// ─── Sign out ─────────────────────────────────────────────────
/**
 * Signs the user out and redirects to the marketing homepage.
 * Clears local session and cached plan data.
 *
 * @returns {Promise<void>}
 */
async function signOut() {
  try {
    // Clear cached plan from session storage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('sp_plan');
    }

    await db.auth.signOut();
  } catch (err) {
    console.error('[Auth] signOut error:', err);
  } finally {
    // Always redirect to marketing page on sign out
    window.location.href = '/index.html';
  }
}

// ─── Get current user ─────────────────────────────────────────
/**
 * Returns the current authenticated user, or null.
 * Reads from the active session — does NOT make a network request.
 *
 * @returns {Promise<object|null>}
 */
async function getUser() {
  try {
    const { data: { user }, error } = await db.auth.getUser();
    if (error) return null;
    return user || null;
  } catch {
    return null;
  }
}

// ─── Private helpers ──────────────────────────────────────────

/**
 * Shows the login modal overlay.
 * The modal is defined in app/index.html.
 */
function _showLoginModal() {
  const modal = document.getElementById('login-modal');
  const shell = document.getElementById('app-shell');

  if (modal) {
    modal.classList.remove('hidden');
  }
  if (shell) {
    // Keep shell hidden until authenticated
    shell.classList.add('hidden');
  }
}

/**
 * Hides the login modal and shows the app shell.
 * Called after successful auth state change.
 */
function _hideLoginModal() {
  const modal = document.getElementById('login-modal');
  const shell = document.getElementById('app-shell');

  if (modal) modal.classList.add('hidden');
  if (shell) shell.classList.remove('hidden');
}

// ─── Listen for auth state changes ───────────────────────────
// Handles the case where the user clicks the magic link and the
// page receives the token in the URL hash.
db.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    _hideLoginModal();

    // If we're on the app shell, trigger a page reload to load dashboard content
    // Only reload if the app-content is still showing the loading/login state
    const appContent = document.getElementById('app-content');
    if (appContent) {
      const isStillLoading = appContent.querySelector('#content-loading') &&
        !appContent.querySelector('#content-loading').classList.contains('hidden');
      if (isStillLoading) {
        window.location.reload();
      }
    }
  }

  if (event === 'SIGNED_OUT') {
    window.location.href = '/index.html';
  }
});
