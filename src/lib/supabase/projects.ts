import { getSupabase } from './server';

// ===== PROJECTS =====

export async function createProject(
  userId: string | null,
  anonymousId: string | null,
  name: string = 'Untitled Project'
) {
  const db = getSupabase();
  const { data: project, error } = await db.from('projects').insert({
    user_id: userId,
    anonymous_id: anonymousId,
    name,
  }).select().single();

  if (error) throw new Error(`Failed to create project: ${error.message}`);

  // Auto-create the business_name component
  await db.from('project_components').insert({
    project_id: project.id,
    component_type: 'business_name',
    status: 'incomplete',
  });

  return project;
}

export async function getProject(projectId: string) {
  const db = getSupabase();
  const { data, error } = await db.from('projects')
    .select('*, project_components(*)')
    .eq('id', projectId)
    .single();
  if (error) throw new Error(`Failed to get project: ${error.message}`);
  return data;
}

export async function listProjects(userId: string | null, anonymousId: string | null) {
  const db = getSupabase();
  let query = db.from('projects')
    .select('*, project_components(component_type, status)')
    .order('updated_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (anonymousId) {
    query = query.eq('anonymous_id', anonymousId);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list projects: ${error.message}`);
  return data || [];
}

export async function updateProject(projectId: string, updates: {
  name?: string;
  chosen_name?: string;
  chosen_domain?: string;
  status?: 'active' | 'archived';
}) {
  const db = getSupabase();
  const { data, error } = await db.from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update project: ${error.message}`);
  return data;
}

export async function updateComponentStatus(
  projectId: string,
  componentType: string,
  status: 'incomplete' | 'in_progress' | 'complete',
  resultData?: Record<string, any>
) {
  const db = getSupabase();
  const updates: any = { status };
  if (resultData) updates.result_data = resultData;

  const { error } = await db.from('project_components')
    .update(updates)
    .eq('project_id', projectId)
    .eq('component_type', componentType);
  if (error) throw new Error(`Failed to update component: ${error.message}`);
}

// ===== SEARCHES =====

export async function createSearch(
  projectId: string,
  userId: string | null,
  anonymousId: string | null,
  config: Record<string, any> = {}
) {
  const db = getSupabase();

  // Find the business_name component for this project
  const { data: component } = await db.from('project_components')
    .select('id')
    .eq('project_id', projectId)
    .eq('component_type', 'business_name')
    .single();

  const { data, error } = await db.from('searches').insert({
    project_id: projectId,
    component_id: component?.id || null,
    user_id: userId,
    anonymous_id: anonymousId,
    config,
  }).select().single();

  if (error) throw new Error(`Failed to create search: ${error.message}`);

  // Mark component as in_progress
  if (component) {
    await db.from('project_components')
      .update({ status: 'in_progress' })
      .eq('id', component.id)
      .eq('status', 'incomplete');
  }

  return data;
}

export async function getSearch(searchId: string) {
  const db = getSupabase();
  const { data, error } = await db.from('searches')
    .select('*')
    .eq('id', searchId)
    .single();
  if (error) throw new Error(`Failed to get search: ${error.message}`);
  return data;
}

export async function listSearches(projectId: string) {
  const db = getSupabase();
  const { data, error } = await db.from('searches')
    .select('id, config, created_at, updated_at')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to list searches: ${error.message}`);
  return data || [];
}

export async function updateSearchConfig(searchId: string, config: Record<string, any>) {
  const db = getSupabase();
  const { error } = await db.from('searches')
    .update({ config })
    .eq('id', searchId);
  if (error) throw new Error(`Failed to update search config: ${error.message}`);
}

export async function getMostRecentSearch(userId: string | null, anonymousId: string | null, projectId?: string) {
  const db = getSupabase();
  let query = db.from('searches')
    .select('id, project_id, config, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (anonymousId) {
    query = query.eq('anonymous_id', anonymousId);
  } else {
    return null;
  }

  const { data } = await query.maybeSingle();
  return data;
}

// ===== SEARCH RESULTS =====

export async function saveSearchResults(searchId: string, results: Array<{
  name: string;
  category?: string;
  rationale?: string;
  gradient?: string;
  font_family?: string;
  text_color?: string;
  exact_domain?: string;
  variants?: string[];
  batch_number?: number;
  position?: number;
}>) {
  const db = getSupabase();
  const rows = results.map(r => ({
    search_id: searchId,
    name: r.name,
    category: r.category || null,
    rationale: r.rationale || null,
    gradient: r.gradient || null,
    font_family: r.font_family || null,
    text_color: r.text_color || null,
    exact_domain: r.exact_domain || null,
    variants: r.variants || [],
    batch_number: r.batch_number || 1,
    position: r.position || 0,
  }));

  const { data, error } = await db.from('search_results').insert(rows).select();
  if (error) throw new Error(`Failed to save results: ${error.message}`);
  return data;
}

export async function getSearchResults(searchId: string) {
  const db = getSupabase();
  const { data, error } = await db.from('search_results')
    .select('*')
    .eq('search_id', searchId)
    .order('position', { ascending: true });
  if (error) throw new Error(`Failed to get results: ${error.message}`);
  return data || [];
}

export async function toggleSaveResult(resultId: string, isSaved: boolean) {
  const db = getSupabase();
  const { error } = await db.from('search_results')
    .update({ is_saved: isSaved })
    .eq('id', resultId);
  if (error) throw new Error(`Failed to toggle save: ${error.message}`);
}

export async function chooseResult(resultId: string, searchId: string) {
  const db = getSupabase();

  // Get the project ID from this search
  const { data: search } = await db.from('searches').select('project_id').eq('id', searchId).single();
  if (search) {
    // Get all search IDs for this project
    const { data: allSearches } = await db.from('searches').select('id').eq('project_id', search.project_id);
    if (allSearches) {
      const allIds = allSearches.map((s: any) => s.id);
      // Unchoose any previously chosen result across all searches in this project
      await db.from('search_results')
        .update({ is_chosen: false })
        .in('search_id', allIds)
        .eq('is_chosen', true);
    }
  }

  // Choose this one
  const { data, error } = await db.from('search_results')
    .update({ is_chosen: true, is_saved: true })
    .eq('id', resultId)
    .select()
    .single();
  if (error) throw new Error(`Failed to choose result: ${error.message}`);
  return data;
}

export async function getSavedResults(projectId: string) {
  const db = getSupabase();
  // Get all searches for this project first, then get saved results
  const { data: searches } = await db.from('searches')
    .select('id')
    .eq('project_id', projectId);
  
  if (!searches || searches.length === 0) return [];
  
  const searchIds = searches.map((s: any) => s.id);
  const { data, error } = await db.from('search_results')
    .select('*')
    .in('search_id', searchIds)
    .eq('is_saved', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to get saved results: ${error.message}`);
  return data || [];
}

export async function updateResultDomainChecks(resultId: string, domainChecks: Record<string, any>) {
  const db = getSupabase();
  const { error } = await db.from('search_results')
    .update({ domain_checks: domainChecks })
    .eq('id', resultId);
  if (error) throw new Error(`Failed to update domain checks: ${error.message}`);
}

// ===== CHAT MESSAGES =====

export async function saveChatMessage(searchId: string, message: {
  role: 'user' | 'assistant' | 'system-event';
  content: string;
  suggested_changes?: any;
}) {
  const db = getSupabase();
  const { data, error } = await db.from('search_chat_messages').insert({
    search_id: searchId,
    role: message.role,
    content: message.content,
    suggested_changes: message.suggested_changes || null,
  }).select().single();
  if (error) throw new Error(`Failed to save chat message: ${error.message}`);
  return data;
}

export async function getChatMessages(searchId: string) {
  const db = getSupabase();
  const { data, error } = await db.from('search_chat_messages')
    .select('*')
    .eq('search_id', searchId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to get chat messages: ${error.message}`);
  return data || [];
}

// ===== DIVIDERS =====

export async function saveDivider(searchId: string, position: number, text: string) {
  const db = getSupabase();
  const { error } = await db.from('search_dividers').insert({
    search_id: searchId,
    position,
    text,
  });
  if (error) throw new Error(`Failed to save divider: ${error.message}`);
}

export async function getDividers(searchId: string) {
  const db = getSupabase();
  const { data, error } = await db.from('search_dividers')
    .select('*')
    .eq('search_id', searchId)
    .order('position', { ascending: true });
  if (error) throw new Error(`Failed to get dividers: ${error.message}`);
  return data || [];
}
