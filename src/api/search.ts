import client from './client';

export interface SearchResult {
  id: string;
  type: 'form' | 'diary' | 'safety' | 'labour' | 'rfi' | 'cleansing' | 'project' | 'team' | 'document';
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  author?: string;
  createdAt: string;
  relevanceScore?: number;
  url?: string;
}

export interface GlobalSearchResponse {
  results: SearchResult[];
  total: number;
  timestamp: string;
}

export interface SearchFilters {
  type?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  author?: string;
  status?: string;
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
  results?: SearchResult[];
}

// GET /search
export const globalSearch = (query: string, filters?: SearchFilters, limit: number = 20): Promise<GlobalSearchResponse> => {
  const params = { query, limit, ...filters };
  return client.get('/search', { params }).then(r => r.data);
};

// GET /search/forms
export const searchForms = (query: string, projectId?: string): Promise<SearchResult[]> => {
  const params = { query, ...(projectId && { projectId }) };
  return client.get('/search/forms', { params }).then(r => r.data);
};

// GET /search/diary
export const searchDiaryEntries = (query: string, projectId?: string): Promise<SearchResult[]> => {
  const params = { query, ...(projectId && { projectId }) };
  return client.get('/search/diary', { params }).then(r => r.data);
};

// GET /search/safety
export const searchSafetyEntries = (query: string, projectId?: string): Promise<SearchResult[]> => {
  const params = { query, ...(projectId && { projectId }) };
  return client.get('/search/safety', { params }).then(r => r.data);
};

// GET /search/labour
export const searchLabourEntries = (query: string, projectId?: string): Promise<SearchResult[]> => {
  const params = { query, ...(projectId && { projectId }) };
  return client.get('/search/labour', { params }).then(r => r.data);
};

// GET /search/rfi
export const searchRfiEntries = (query: string, projectId?: string): Promise<SearchResult[]> => {
  const params = { query, ...(projectId && { projectId }) };
  return client.get('/search/rfi', { params }).then(r => r.data);
};

// GET /search/projects
export const searchProjects = (query: string): Promise<SearchResult[]> =>
  client.get('/search/projects', { params: { query } }).then(r => r.data);

// GET /search/recent
export const getRecentSearches = (): Promise<RecentSearch[]> =>
  client.get('/search/recent').then(r => r.data);

// POST /search/save
export const saveSearch = (query: string): Promise<RecentSearch> =>
  client.post('/search/save', { query }).then(r => r.data);

// DELETE /search/recent/:id
export const deleteRecentSearch = (id: string): Promise<any> =>
  client.delete(`/search/recent/${id}`).then(r => r.data);

// DELETE /search/recent
export const clearRecentSearches = (): Promise<any> =>
  client.delete('/search/recent').then(r => r.data);
