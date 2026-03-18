// tokens.js — Sign token management

function generateSignToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getTokenExpiry(hoursFromNow = 72) {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
}

async function createSigningLink(documentId, subEmail) {
  const token = generateSignToken();
  const expiry = getTokenExpiry(72);
  const { error } = await db
    .from('documents')
    .update({ sign_token: token, sign_token_expires_at: expiry, status: 'pending_signature' })
    .eq('id', documentId);
  if (error) throw error;
  const base = window.location.origin;
  return `${base}/app/sign.html?token=${token}`;
}

async function invalidateToken(documentId) {
  const { error } = await db
    .from('documents')
    .update({ sign_token: null, sign_token_expires_at: null })
    .eq('id', documentId);
  if (error) throw error;
}

window.generateSignToken = generateSignToken;
window.getTokenExpiry = getTokenExpiry;
window.createSigningLink = createSigningLink;
window.invalidateToken = invalidateToken;
