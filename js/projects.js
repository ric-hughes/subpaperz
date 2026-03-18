// projects.js — Project CRUD

async function loadProjects() {
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from('projects').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function createProject(projectData) {
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from('projects').insert({ ...projectData, owner_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

async function updateProject(id, projectData) {
  const { data: { user } } = await db.auth.getUser();
  const { data, error } = await db.from('projects').update(projectData).eq('id', id).eq('owner_id', user.id).select().single();
  if (error) throw error;
  return data;
}

async function archiveProject(id, newStatus = 'completed') {
  return updateProject(id, { status: newStatus });
}

async function deleteProject(id) {
  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from('projects').delete().eq('id', id).eq('owner_id', user.id);
  if (error) throw error;
}

async function getProjectComplianceScore(projectId) {
  const { data: subs } = await db.from('subcontractors').select('id').eq('project_id', projectId);
  if (!subs || !subs.length) return 100;
  let total = 0;
  for (const sub of subs) {
    total += await getSubComplianceScore(sub.id);
  }
  return Math.round(total / subs.length);
}

window.loadProjects = loadProjects;
window.createProject = createProject;
window.updateProject = updateProject;
window.archiveProject = archiveProject;
window.deleteProject = deleteProject;
window.getProjectComplianceScore = getProjectComplianceScore;
