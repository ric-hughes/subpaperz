/**
 * SubPaperz — Plan Management Module
 *
 * Requires: supabase-client.js (db), config.js (PLAN_LIMITS)
 *
 * Exported functions:
 *   getPlan()            — returns 'free' | 'pro' | 'team'
 *   enforcePlanGates()   — locks DOM elements the user's plan can't access
 *   setPlanBadge()       — updates the sidebar plan badge
 */

// Simple in-memory cache so we don't re-query on every call within a session
let _cachedPlan = null;

// ─── Get Plan ────────────────────────────────────────────────
/**
 * Queries the `profiles` table for the current user's plan.
 * Falls back to 'free' on any error.
 *
 * Expected `profiles` table schema:
 *   id         uuid  (matches auth.users.id)
 *   plan       text  ('free' | 'pro' | 'team')
 *   updated_at timestamptz
 *
 * @returns {Promise<'free'|'pro'|'team'>}
 */
async function getPlan() {
  // Return cached value within the same page session
  if (_cachedPlan) return _cachedPlan;

  // Check sessionStorage for a cross-page cache
  const stored = sessionStorage.getItem('sp_plan');
  if (stored && ['free', 'pro', 'team'].includes(stored)) {
    _cachedPlan = stored;
    return _cachedPlan;
  }

  try {
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return 'free';
    }

    const { data, error } = await db
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (error) {
      // Profile row may not exist yet (new user) — default to free
      if (error.code !== 'PGRST116') {
        // PGRST116 = "row not found" — expected for new users
        console.warn('[Plan] profiles query error:', error.message);
      }
      _cachedPlan = 'free';
    } else {
      const plan = data?.plan;
      _cachedPlan = ['free', 'pro', 'team'].includes(plan) ? plan : 'free';
    }

  } catch (err) {
    console.error('[Plan] getPlan exception:', err);
    _cachedPlan = 'free';
  }

  // Cache in sessionStorage so other pages don't re-query
  sessionStorage.setItem('sp_plan', _cachedPlan);
  return _cachedPlan;
}

// ─── Enforce Plan Gates ───────────────────────────────────────
/**
 * Scans the DOM for elements with `[data-requires-plan]` and locks
 * any that the current user's plan doesn't qualify for.
 *
 * HTML usage:
 *   <button data-requires-plan="pro" data-upgrade-tooltip="Upgrade to Pro to use e-signatures">
 *     Send for Signature
 *   </button>
 *
 * When locked, the element:
 *   - Gets `data-plan-locked="true"` (triggers CSS opacity + cursor: not-allowed)
 *   - Gets a visible tooltip on hover (via CSS ::after + data-upgrade-tooltip)
 *   - Has click events blocked via pointer-events: none
 *
 * @returns {Promise<void>}
 */
async function enforcePlanGates() {
  const plan       = await getPlan();
  const gatedEls   = document.querySelectorAll('[data-requires-plan]');

  if (!gatedEls.length) return;

  const planRank = { free: 0, pro: 1, team: 2 };
  const userRank = planRank[plan] ?? 0;

  gatedEls.forEach(el => {
    const requiredPlan = el.getAttribute('data-requires-plan');
    const requiredRank = planRank[requiredPlan] ?? 1;

    if (userRank < requiredRank) {
      // Lock it
      el.setAttribute('data-plan-locked', 'true');
      // Set tooltip text if not already provided
      if (!el.hasAttribute('data-upgrade-tooltip')) {
        const planLabel = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);
        el.setAttribute('data-upgrade-tooltip', `Upgrade to ${planLabel} to unlock`);
      }
      // Disable form fields / buttons natively as well
      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.disabled = true;
      }
    } else {
      // Unlock: remove any previously applied gate
      el.removeAttribute('data-plan-locked');
      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.disabled = false;
      }
    }
  });
}

// ─── Set Plan Badge ───────────────────────────────────────────
/**
 * Updates the sidebar plan badge (#plan-badge) with the current
 * user's plan name and appropriate color styling.
 *
 * Badge text:
 *   free  → "Free Plan"
 *   pro   → "Pro"
 *   team  → "Team"
 *
 * Color changes are handled by CSS rules targeting [data-plan] attribute.
 *
 * @returns {Promise<void>}
 */
async function setPlanBadge() {
  const plan      = await getPlan();
  const badge     = document.getElementById('plan-badge');
  const badgeText = document.getElementById('plan-badge-text');

  if (!badge || !badgeText) return;

  const labels = {
    free: 'Free Plan',
    pro:  'Pro',
    team: 'Team',
  };

  badgeText.textContent = labels[plan] || 'Free Plan';
  badge.setAttribute('data-plan', plan);

  // Update the upgrade link visibility
  const upgradeLink = document.getElementById('plan-upgrade-link');
  if (upgradeLink) {
    if (plan === 'team') {
      upgradeLink.style.display = 'none';
    } else if (plan === 'pro') {
      upgradeLink.textContent = 'Go Team';
      upgradeLink.href = typeof STRIPE_TEAM_LINK !== 'undefined'
        ? STRIPE_TEAM_LINK
        : '/index.html#pricing';
    } else {
      upgradeLink.textContent = 'Upgrade';
      upgradeLink.href = typeof STRIPE_PRO_LINK !== 'undefined'
        ? STRIPE_PRO_LINK
        : '/index.html#pricing';
    }
  }
}

/**
 * Checks if the current user's plan meets a minimum requirement.
 * Useful for inline guards in other JS files.
 *
 * @param {'free'|'pro'|'team'} requiredPlan
 * @returns {Promise<boolean>}
 *
 * @example
 *   if (!(await hasAccess('pro'))) {
 *     alert('Upgrade to Pro to use e-signatures.');
 *     return;
 *   }
 */
async function hasAccess(requiredPlan) {
  const plan = await getPlan();
  const rank = { free: 0, pro: 1, team: 2 };
  return (rank[plan] ?? 0) >= (rank[requiredPlan] ?? 1);
}

/**
 * Clears the cached plan value. Call this after a successful upgrade
 * so getPlan() re-fetches from the database.
 */
function clearPlanCache() {
  _cachedPlan = null;
  sessionStorage.removeItem('sp_plan');
}
