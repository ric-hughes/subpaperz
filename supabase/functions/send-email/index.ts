// send-email — Supabase Edge Function
// Generic email sender via Resend. Called from browser JS with an internal secret header.
//
// Deploy: supabase functions deploy send-email
//
// Required env vars (Supabase Dashboard → Settings → Edge Functions → Secrets):
//   RESEND_API_KEY
//   INTERNAL_SECRET   (must match the value in js/email.js)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET') || ''

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-secret',
      },
    })
  }

  // Validate internal secret
  const secret = req.headers.get('x-internal-secret')
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { to: string; subject: string; html_body: string; reply_to?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { to, subject, html_body, reply_to } = body
  if (!to || !subject || !html_body) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html_body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const payload: Record<string, unknown> = {
    from: 'SubPaperz <noreply@subpaperz.com>',
    to: [to],
    subject,
    html: html_body,
  }
  if (reply_to) payload.reply_to = reply_to

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.message || 'Email send failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  return new Response(JSON.stringify({ success: true, id: data.id }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
