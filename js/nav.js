/**
 * SubPaperz — Navigation Module
 *
 * Handles sidebar active state based on current URL path.
 *
 * Usage:
 *   setActiveNav()  — call on DOMContentLoaded after the shell renders
 */

/**
 * Reads the current URL pathname and marks the matching sidebar
 * nav link as active using the `.active` CSS class and aria-current.
 *
 * Matching logic:
 *   - Checks each .nav-link element's `data-page` attribute
 *   - Compares against the URL pathname (e.g. /app/projects.html → "projects")
 *   - Falls back to "dashboard" on /app/index.html
 */
function setActiveNav() {
  const path     = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  if (!navLinks.length) return;

  // Derive the current page key from the path
  let currentPage = 'dashboard';

  if (path.includes('/app/')) {
    const filename = path.split('/').pop().replace('.html', '');
    if (filename && filename !== 'index') {
      currentPage = filename;
    }
  }

  // Also support a ?page= query param override (useful for SPAs)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('page')) {
    currentPage = urlParams.get('page');
  }

  navLinks.forEach(link => {
    const linkPage = link.getAttribute('data-page');

    // Remove any previously set active state
    link.classList.remove('active');
    link.removeAttribute('aria-current');

    if (linkPage === currentPage) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/**
 * Navigates to a new page within the app shell by updating the
 * URL (pushState) and reloading the content area.
 * Primarily used for future SPA-style navigation.
 *
 * @param {string} page  — page key matching a nav-link's data-page attribute
 * @param {string} [url] — optional explicit URL to navigate to
 */
function navigateTo(page, url) {
  const destination = url || `/app/${page === 'dashboard' ? 'index' : page}.html`;
  window.location.href = destination;
}

// Auto-run on script load if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setActiveNav);
} else {
  setActiveNav();
}
