/**
 * SubPaperz — Utility Functions
 *
 * Pure helper functions. No dependencies on other SubPaperz modules.
 * Safe to import anywhere.
 */

// ─── Date Formatting ─────────────────────────────────────────

/**
 * Formats a date value as "Mar 17, 2026".
 *
 * @param {string|Date|number} date — ISO string, Date object, or timestamp
 * @returns {string} formatted date string, or empty string on failure
 *
 * @example
 *   formatDate('2026-03-17')          // "Mar 17, 2026"
 *   formatDate(new Date())            // "Mar 17, 2026"
 *   formatDate('2026-03-17T14:30:00') // "Mar 17, 2026"
 */
function formatDate(date) {
  if (!date) return '';
  try {
    const d = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Returns the number of calendar days until a future date.
 * Returns a negative number if the date is in the past.
 *
 * @param {string|Date|number} date
 * @returns {number} integer days (can be negative if past)
 *
 * @example
 *   daysUntil('2026-04-17') // 31 (if today is Mar 17 2026)
 *   daysUntil('2025-01-01') // -n (past date)
 */
function daysUntil(date) {
  if (!date) return 0;
  try {
    const target = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

    if (isNaN(target.getTime())) return 0;

    const now     = new Date();
    // Use start of day for both to get clean calendar days
    const todayMs  = Date.UTC(now.getFullYear(),    now.getMonth(),    now.getDate());
    const targetMs = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Returns a relative time string like "2 days ago" or "in 3 months".
 * Falls back to formatDate() for dates more than 1 year away.
 *
 * @param {string|Date|number} date
 * @returns {string}
 */
function timeAgo(date) {
  if (!date) return '';
  const days = daysUntil(date);
  const abs  = Math.abs(days);

  if (abs === 0) return 'Today';
  if (abs === 1) return days < 0 ? 'Yesterday' : 'Tomorrow';
  if (abs < 7)   return days < 0 ? `${abs} days ago` : `In ${abs} days`;
  if (abs < 30)  return days < 0 ? `${Math.round(abs/7)} weeks ago` : `In ${Math.round(abs/7)} weeks`;
  if (abs < 365) return days < 0 ? `${Math.round(abs/30)} months ago` : `In ${Math.round(abs/30)} months`;
  return formatDate(date);
}

// ─── State Select HTML ────────────────────────────────────────

/**
 * Returns an HTML string of <option> elements for the 9 allowed states.
 * Uses ALLOWED_STATES from config.js.
 *
 * @param {string} [selected] — state code to pre-select (e.g. 'ID')
 * @returns {string} HTML option list
 *
 * @example
 *   document.getElementById('state-select').innerHTML =
 *     '<option value="">Select state...</option>' + getStateSelectHTML('ID');
 */
function getStateSelectHTML(selected) {
  const states = typeof ALLOWED_STATES !== 'undefined'
    ? ALLOWED_STATES
    : [
        { code: 'ID', name: 'Idaho' },
        { code: 'SD', name: 'South Dakota' },
        { code: 'NE', name: 'Nebraska' },
        { code: 'KS', name: 'Kansas' },
        { code: 'CO', name: 'Colorado' },
        { code: 'MT', name: 'Montana' },
        { code: 'OK', name: 'Oklahoma' },
        { code: 'NH', name: 'New Hampshire' },
        { code: 'ND', name: 'North Dakota' },
      ];

  return states
    .map(s => {
      const isSelected = s.code === selected ? ' selected' : '';
      const hqLabel    = s.hq ? ' (HQ)' : '';
      return `<option value="${s.code}"${isSelected}>${s.name}${hqLabel}</option>`;
    })
    .join('\n');
}

// ─── UUID Generation ──────────────────────────────────────────

/**
 * Generates a UUID v4 string.
 * Uses the native crypto.randomUUID() if available (modern browsers),
 * falls back to a manual implementation.
 *
 * @returns {string} UUID v4 (e.g. "550e8400-e29b-41d4-a716-446655440000")
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Polyfill for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Slugify ──────────────────────────────────────────────────

/**
 * Converts a string to a URL-safe slug.
 * Lowercases, strips special chars, replaces spaces/separators with hyphens.
 *
 * @param {string} str
 * @returns {string} slug
 *
 * @example
 *   slugify('Blue River Framing LLC') // "blue-river-framing-llc"
 *   slugify('COI Tracker & Alerts')   // "coi-tracker-alerts"
 */
function slugify(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')                          // Decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')           // Strip diacritics
    .replace(/[&+]/g, '-and-')                 // & and + → "and"
    .replace(/[^\w\s-]/g, '')                  // Remove non-word chars
    .replace(/[\s_]+/g, '-')                   // Spaces/underscores → hyphens
    .replace(/-{2,}/g, '-')                    // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');                  // Trim leading/trailing hyphens
}

// ─── Currency Formatting ──────────────────────────────────────

/**
 * Formats a number as USD currency string.
 *
 * @param {number} amount
 * @param {boolean} [showCents=true]
 * @returns {string} e.g. "$1,250.00" or "$1,250"
 */
function formatCurrency(amount, showCents = true) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

// ─── DOM Helpers ─────────────────────────────────────────────

/**
 * Shows a temporary toast notification.
 * Creates and appends a toast element, removes it after `duration` ms.
 *
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='success']
 * @param {number} [duration=3500]
 */
function showToast(message, type = 'success', duration = 3500) {
  const colorMap = {
    success: 'bg-green-900 border-green-700 text-green-200',
    error:   'bg-red-900 border-red-700 text-red-200',
    warning: 'bg-yellow-900 border-yellow-700 text-yellow-200',
    info:    'bg-blue-900 border-blue-700 text-blue-200',
  };

  const iconMap = {
    success: '✅',
    error:   '❌',
    warning: '⚠️',
    info:    'ℹ️',
  };

  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-semibold transition-all ${colorMap[type] || colorMap.info}`;
  toast.innerHTML = `<span>${iconMap[type] || 'ℹ️'}</span><span>${message}</span>`;

  // Animate in
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(12px)';
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transition = 'opacity 0.2s, transform 0.2s';
    toast.style.opacity    = '1';
    toast.style.transform  = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Escapes HTML special characters to prevent XSS when inserting
 * user-provided strings into innerHTML.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
