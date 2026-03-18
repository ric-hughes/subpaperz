// coi.js — COI tracking and management

function getCOIStatus(expiryDate) {
  const exp = new Date(expiryDate);
  const now = new Date();
  const days = Math.ceil((exp - now) / 86400000);
  if (days < 0) return { status: 'expired', days, label: 'Expired', color: 'red' };
  if (days <= 30) return { status: 'expiring', days, label: `Expiring in ${days}d`, color: 'yellow' };
  return { status: 'active', days, label: 'Active', color: 'green' };
}

async function loadCOIs(subId = null) {
  let query = db.from('coi_records').select('*, subcontractors(company_name, email, contact_name)').order('expiry_date', { ascending: true });
  if (subId) query = query.eq('sub_id', subId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function uploadCOI(subId, file, metadata) {
  const user = (await db.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const path = `${user.id}/${subId}/coi_${Date.now()}.pdf`;
  const { error: uploadErr } = await db.storage.from('coi-uploads').upload(path, file, { contentType: file.type });
  if (uploadErr) throw uploadErr;
  const { data, error } = await db.from('coi_records').insert({
    owner_id: user.id,
    sub_id: subId,
    storage_path: path,
    insurer_name: metadata.insurerName,
    policy_number: metadata.policyNumber,
    effective_date: metadata.effectiveDate,
    expiry_date: metadata.expiryDate,
    gl_limit: metadata.glLimit || null,
    wc_limit: metadata.wcLimit || null,
  }).select().single();
  if (error) throw error;
  return data;
}

async function deleteCOI(id, storagePath) {
  if (storagePath) await db.storage.from('coi-uploads').remove([storagePath]);
  const { error } = await db.from('coi_records').delete().eq('id', id);
  if (error) throw error;
}

async function getCOIUrl(storagePath) {
  const { data } = await db.storage.from('coi-uploads').createSignedUrl(storagePath, 3600);
  return data?.signedUrl || null;
}

async function sendRenewalReminder(coiId) {
  const { data: coi, error } = await db.from('coi_records').select('*, subcontractors(company_name, email, contact_name)').eq('id', coiId).single();
  if (error || !coi) throw error || new Error('COI not found');
  const sub = coi.subcontractors;
  if (!sub?.email) throw new Error('Subcontractor has no email on file');

  // Generate upload token (reuse existing if already set)
  let uploadToken = coi.upload_token;
  if (!uploadToken) {
    uploadToken = crypto.randomUUID();
    await db.from('coi_records').update({ upload_token: uploadToken }).eq('id', coiId);
  }
  const uploadURL = 'https://subpaperz.com/app/coi-upload.html?token=' + uploadToken;

  // Get GC company name from profile
  const { data: profile } = await db.from('profiles').select('company_name').eq('id', coi.owner_id).single();
  const gcName = profile?.company_name || 'Your General Contractor';

  const result = await sendCOIRenewalReminder({
    subEmail: sub.email,
    subName: sub.contact_name || sub.company_name,
    gcName,
    expiryDate: new Date(coi.expiry_date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),
    uploadURL,
  });
  if (result.success) {
    await db.from('coi_records').update({ reminder_30_sent: true }).eq('id', coiId);
  }
  return result;
}

async function getExpiringSoon(days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const { data, error } = await db.from('coi_records')
    .select('*, subcontractors(company_name, email)')
    .lte('expiry_date', cutoff.toISOString().split('T')[0])
    .gte('expiry_date', new Date().toISOString().split('T')[0]);
  if (error) throw error;
  return data || [];
}

window.getCOIStatus = getCOIStatus;
window.loadCOIs = loadCOIs;
window.uploadCOI = uploadCOI;
window.deleteCOI = deleteCOI;
window.getCOIUrl = getCOIUrl;
window.sendRenewalReminder = sendRenewalReminder;
window.getExpiringSoon = getExpiringSoon;
