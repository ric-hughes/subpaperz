/**
 * SubPaperz — App Configuration
 *
 * SETUP REQUIRED:
 *   1. Replace SUPABASE_URL and SUPABASE_ANON_KEY with your Supabase project values.
 *      Find them at: https://app.supabase.com → Your Project → Settings → API
 *
 *   2. Replace Stripe links after creating products in your Stripe Dashboard.
 *      Use Payment Links (https://dashboard.stripe.com/payment-links).
 *
 *   3. Replace the Formspree form ID in index.html with your own form.
 *      Create one at: https://formspree.io
 *
 * CLOUDFLARE DEPLOYMENT NOTE:
 *   Do NOT expose secret keys here. SUPABASE_ANON_KEY is safe to expose
 *   (it's designed for browser use with RLS policies). Never put your
 *   Supabase service_role key here.
 */

// ─── Supabase ─────────────────────────────────────────────────
const SUPABASE_URL      = 'https://ygxvkcxekafymmyfmeej.supabase.co';       // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlneHZrY3hla2FmeW1teWZtZWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjcwMjMsImV4cCI6MjA4OTM0MzAyM30.nmR8I5fPxKa1jrRZgwGuwLSgaAYrD6jJP3SeaTtFsj8';  // public anon key — safe for browser

// ─── Stripe Payment Links ─────────────────────────────────────
const STRIPE_PRO_LINK    = 'https://buy.stripe.com/test_8x2cN5f21e4qc680a98g000';
const STRIPE_TEAM_LINK   = 'https://buy.stripe.com/aFa28rcTTaSe3zCe0Z8g002';
const STRIPE_FOUNDER_LINK = 'https://buy.stripe.com/aFaaEXbPP9Oa5HK4qp8g001'; // 50% off for 3 months, limit 100

// ─── App Settings ─────────────────────────────────────────────
const APP_URL          = 'https://subpaperz.com';
const APP_NAME         = 'SubPaperz';

// Redirect URL for Supabase magic link emails
// Must match what you configure in Supabase → Auth → URL Configuration
const AUTH_REDIRECT_URL = `${APP_URL}/app/index.html`;

// How many days before COI expiry to start showing warnings
const COI_WARNING_DAYS  = 30;
const COI_ALERT_DAYS    = 60;

// ─── Supported States ─────────────────────────────────────────
const ALLOWED_STATES = [
  { code: 'ID', name: 'Idaho',          hq: true  },
  { code: 'SD', name: 'South Dakota',   hq: false },
  { code: 'NE', name: 'Nebraska',       hq: false },
  { code: 'KS', name: 'Kansas',         hq: false },
  { code: 'CO', name: 'Colorado',       hq: false },
  { code: 'MT', name: 'Montana',        hq: false },
  { code: 'OK', name: 'Oklahoma',       hq: false },
  { code: 'NH', name: 'New Hampshire',  hq: false },
  { code: 'ND', name: 'North Dakota',   hq: false },
];

// ─── Plan Definitions ─────────────────────────────────────────
const PLAN_LIMITS = {
  free: {
    maxDocuments:    3,
    maxUsers:        1,
    eSign:           false,
    coiTracking:     false,
    emailReminders:  false,
  },
  pro: {
    maxDocuments:    Infinity,
    maxUsers:        1,
    eSign:           true,
    coiTracking:     true,
    emailReminders:  true,
  },
  team: {
    maxDocuments:    Infinity,
    maxUsers:        5,
    eSign:           true,
    coiTracking:     true,
    emailReminders:  true,
    teamSeats:       true,
    prioritySupport: true,
  },
};

// ─── Document Types ───────────────────────────────────────────
const DOC_TYPES = [
  { value: 'w9',                   label: 'W-9'                              },
  { value: 'lien_waiver_uncond_f', label: 'Lien Waiver — Unconditional Final' },
  { value: 'lien_waiver_cond_f',   label: 'Lien Waiver — Conditional Final'   },
  { value: 'lien_waiver_uncond_p', label: 'Lien Waiver — Unconditional Progress' },
  { value: 'lien_waiver_cond_p',   label: 'Lien Waiver — Conditional Progress'  },
  { value: 'sub_agreement',        label: 'Subcontractor Agreement'           },
  { value: 'pay_app',              label: 'Pay Application (AIA G702/G703)'   },
  { value: 'coi',                  label: 'Certificate of Insurance'          },
];
