// documents.js — Document management

async function loadDocuments(filters = {}) {
  const { data: { user } } = await db.auth.getUser();
  let query = db.from('documents')
    .select('*, subcontractors(company_name), projects(name)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  if (filters.type) query = query.eq('doc_type', filters.type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.subId) query = query.eq('sub_id', filters.subId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createDocument(docData) {
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from('documents').insert({ ...docData, owner_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

async function uploadDocumentFile(docId, blob, subId, docType) {
  const { data: { user } } = await db.auth.getUser();
  const path = `${user.id}/${subId || 'general'}/${docType}/${Date.now()}.pdf`;
  const { error: uploadErr } = await db.storage.from('documents').upload(path, blob, { contentType: 'application/pdf' });
  if (uploadErr) throw uploadErr;
  const { error } = await db.from('documents').update({ storage_path: path }).eq('id', docId);
  if (error) throw error;
  return path;
}

async function updateDocumentStatus(id, status, extra = {}) {
  const { error } = await db.from('documents').update({ status, ...extra }).eq('id', id);
  if (error) throw error;
}

async function deleteDocument(id, storagePath = null) {
  if (storagePath) {
    await db.storage.from('documents').remove([storagePath]);
  }
  const { error } = await db.from('documents').delete().eq('id', id);
  if (error) throw error;
}

async function getSigningURL(docId) {
  const { data, error } = await db.from('documents').select('sign_token').eq('id', docId).single();
  if (error || !data?.sign_token) return null;
  return `${window.location.origin}/app/sign.html?token=${data.sign_token}`;
}

window.loadDocuments = loadDocuments;
window.createDocument = createDocument;
window.uploadDocumentFile = uploadDocumentFile;
window.updateDocumentStatus = updateDocumentStatus;
window.deleteDocument = deleteDocument;
window.getSigningURL = getSigningURL;
