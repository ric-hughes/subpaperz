// subs.js — Subcontractor CRUD and compliance scoring

async function loadSubs(projectId = null) {
  const { data: { user } } = await db.auth.getUser();
  let query = db.from('subcontractors').select('*').eq('owner_id', user.id).order('company_name');
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  const subs = data || [];
  // Attach compliance scores
  for (const sub of subs) {
    sub._score = await getSubComplianceScore(sub.id);
  }
  return subs;
}

async function createSub(subData) {
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from('subcontractors').insert({ ...subData, owner_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

async function updateSub(id, subData) {
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from('subcontractors').update(subData).eq('id', id).eq('owner_id', user.id).select().single();
  if (error) throw error;
  return data;
}

async function deleteSub(id) {
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from('subcontractors').delete().eq('id', id).eq('owner_id', user.id);
  if (error) throw error;
}

async function getSubComplianceScore(subId) {
  // Check: W-9 signed, active COI, signed sub agreement
  let score = 100;
  try {
    // W-9
    const { data: w9 } = await db.from('documents').select('id').eq('sub_id', subId).eq('doc_type', 'w9').eq('status', 'signed').limit(1);
    if (!w9 || !w9.length) score -= 25;

    // COI (not expired)
    const today = new Date().toISOString().split('T')[0];
    const { data: coi } = await db.from('coi_records').select('id').eq('sub_id', subId).gte('expiry_date', today).limit(1);
    if (!coi || !coi.length) score -= 50;

    // Sub agreement
    const { data: agreement } = await db.from('documents').select('id').eq('sub_id', subId).eq('doc_type', 'sub_agreement').eq('status', 'signed').limit(1);
    if (!agreement || !agreement.length) score -= 25;
  } catch(e) {
    // If DB isn't set up yet, return 0
    return 0;
  }
  return Math.max(0, score);
}

async function generatePortalInvite(subId) {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await db.from('subcontractors')
    .update({ portal_token: token, portal_token_expires_at: expires })
    .eq('id', subId);
  if (error) throw error;
  return { token, portalURL: `${APP_URL}/app/sub-portal.html?token=${token}` };
}

window.loadSubs = loadSubs;
window.createSub = createSub;
window.updateSub = updateSub;
window.deleteSub = deleteSub;
window.getSubComplianceScore = getSubComplianceScore;
window.generatePortalInvite = generatePortalInvite;
