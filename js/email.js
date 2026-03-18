// email.js — Email sending via Supabase Edge Function

const EDGE_FUNCTION_URL = (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') + '/functions/v1/send-email';
const INTERNAL_SECRET = '72fa56b0-b286-4379-82f4-f00a80fe5647'; // must match edge function secret

async function sendEmail({ to, subject, htmlBody, replyTo = null }) {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : ''}`,
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ to, subject, html_body: htmlBody, reply_to: replyTo }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Email send failed' };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function sendSigningRequest({ subEmail, subName, gcName, documentType, signingURL }) {
  const subject = `${gcName} needs your signature — ${documentType}`;
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#1d4ed8;margin-bottom:8px;">Document Signature Request</h2>
      <p>Hi ${subName},</p>
      <p><strong>${gcName}</strong> has sent you a <strong>${documentType}</strong> to review and sign.</p>
      <p style="margin:24px 0;">
        <a href="${signingURL}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Review & Sign Document →
        </a>
      </p>
      <p style="color:#64748b;font-size:14px;">This link expires in 72 hours. If you have questions about this document, contact ${gcName} directly.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">Powered by <a href="https://subpaperz.com" style="color:#3b82f6;">SubPaperz</a> — Subcontractor Paperwork Platform</p>
    </div>`;
  return sendEmail({ to: subEmail, subject, htmlBody, replyTo: null });
}

async function sendCOIRenewalReminder({ subEmail, subName, gcName, expiryDate, uploadURL }) {
  const subject = `Action Required: Your Certificate of Insurance expires ${expiryDate}`;
  const uploadBtn = uploadURL
    ? `<p style="margin:24px 0;">
        <a href="${uploadURL}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Upload Your Renewal →
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">This link is unique to you. Uploading your renewed COI will automatically update ${gcName}'s records — no login required.</p>`
    : `<p style="color:#64748b;font-size:14px;margin-top:24px;">If you have already renewed your COI, please send a copy to ${gcName} as soon as possible.</p>`;
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#dc2626;margin-bottom:8px;">⚠️ COI Expiring Soon</h2>
      <p>Hi ${subName},</p>
      <p>Your <strong>Certificate of Insurance</strong> on file with <strong>${gcName}</strong> is expiring on <strong>${expiryDate}</strong>.</p>
      <p>Please renew your COI with your insurance broker and upload the updated certificate:</p>
      ${uploadBtn}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">Sent via <a href="https://subpaperz.com" style="color:#3b82f6;">SubPaperz</a></p>
    </div>`;
  return sendEmail({ to: subEmail, subject, htmlBody });
}

async function sendW9Request({ subEmail, subName, gcName, w9URL }) {
  const subject = `${gcName} needs your W-9`;
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#1d4ed8;margin-bottom:8px;">W-9 Request</h2>
      <p>Hi ${subName},</p>
      <p><strong>${gcName}</strong> needs your W-9 (Request for Taxpayer Identification) on file before issuing payment.</p>
      <p style="margin:24px 0;">
        <a href="${w9URL}" style="background:#1d4ed8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Complete Your W-9 →
        </a>
      </p>
      <p style="color:#64748b;font-size:14px;">Your information is used only to comply with IRS reporting requirements. It is not used for any other purpose.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">Powered by <a href="https://subpaperz.com" style="color:#3b82f6;">SubPaperz</a></p>
    </div>`;
  return sendEmail({ to: subEmail, subject, htmlBody });
}

async function sendSubPortalInvite({ subEmail, subName, gcName, portalURL }) {
  const subject = `${gcName} has invited you to their subcontractor portal`;
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
      <h2 style="color:#dc2626;margin-bottom:8px;">&#128203; Document Portal Invite</h2>
      <p>Hi ${subName},</p>
      <p><strong>${gcName}</strong> has invited you to their subcontractor portal to upload your documents — no account required.</p>
      <p>From the portal you can:</p>
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;padding-left:20px;">
        <li>Update your contact info</li>
        <li>Upload your Certificate of Insurance (COI)</li>
        <li>Upload your W-9</li>
      </ul>
      <p style="margin:24px 0;">
        <a href="${portalURL}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
          Go to My Portal &rarr;
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">This link is unique to you and expires in 7 days. No account or password required.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">Sent via <a href="https://subpaperz.com" style="color:#3b82f6;">SubPaperz</a></p>
    </div>`;
  return sendEmail({ to: subEmail, subject, htmlBody });
}

window.sendEmail = sendEmail;
window.sendSigningRequest = sendSigningRequest;
window.sendCOIRenewalReminder = sendCOIRenewalReminder;
window.sendW9Request = sendW9Request;
window.sendSubPortalInvite = sendSubPortalInvite;
