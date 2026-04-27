import client from './client';

export interface AdminRequestPayload {
  company_name: string;
  company_details: {
    address?: string;
    phone?: string;
    website?: string;
    registration_number?: string;
    [key: string]: any;
  };
}

export interface AdminRequest {
  id: string;
  company_name: string;
  status: 'pending' | 'approved' | 'rejected';
  company_id?: string;
  company_details?: {
    address?: string;
    phone?: string;
    website?: string;
    registration_number?: string;
  };
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  details?: {
    address?: string;
    phone?: string;
    website?: string;
    registration_number?: string;
  };
  logo_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export interface JoinRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: { id: string; name: string; email: string; avatar?: string };
  company?: { id: string; name: string };
}

export interface CompanyMember {
  user_id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'manager';
  joined_at: string;
  avatar?: string;
}

// POST /admin-requests/request-admin
export const submitAdminRequest = (payload: AdminRequestPayload): Promise<any> =>
  client.post('/admin-requests/request-admin', payload).then(r => r.data);

// PUT /admin-requests/request-admin/:id
export const updateAdminRequest = (id: string, payload: AdminRequestPayload): Promise<any> =>
  client.put(`/admin-requests/request-admin/${id}`, payload).then(r => r.data);

// GET /admin-requests/my-request
export const getMyAdminRequest = (): Promise<AdminRequest> =>
  client.get('/admin-requests/my-request').then(r => r.data);

// POST /companies/join
export const joinCompany = (companyId: string): Promise<any> =>
  client.post('/companies/join', { company_id: companyId }).then(r => r.data);

// GET /companies/:id
export const getCompanyById = (id: string): Promise<Company> =>
  client.get(`/companies/${id}`).then(r => r.data);

// GET /companies/:id/members
export const getCompanyMembers = (id: string): Promise<CompanyMember[]> =>
  client.get(`/companies/${id}/members`).then(r => r.data);

// PUT /companies/:id
export const updateCompany = (id: string, payload: Partial<Company>): Promise<Company> =>
  client.put(`/companies/${id}`, payload).then(r => r.data);

// GET /companies
export const getCompanies = (): Promise<Company[]> =>
  client.get('/companies').then(r => r.data);

// POST /companies
export const createCompany = (payload: Partial<Company>): Promise<Company> =>
  client.post('/companies', payload).then(r => r.data);

// GET /companies/:id/join-requests
export const getCompanyJoinRequests = (companyId: string): Promise<JoinRequest[]> =>
  client.get(`/companies/${companyId}/join-requests`).then(r => r.data);

// POST /companies/:id/join-requests/:joinRequestId/approve
export const approveJoinRequest = (companyId: string, joinRequestId: string): Promise<any> =>
  client.post(`/companies/${companyId}/join-requests/${joinRequestId}/approve`, {}).then(r => r.data);

// POST /companies/:id/join-requests/:joinRequestId/reject
export const rejectJoinRequest = (companyId: string, joinRequestId: string): Promise<any> =>
  client.post(`/companies/${companyId}/join-requests/${joinRequestId}/reject`, {}).then(r => r.data);
export const getCompany = (companyId: string): Promise<any> =>
  client.get(`/companies/${companyId}`).then(r => r.data);

// GET /companies/members
export const getMyCompanyMembers = (): Promise<any[]> =>
  client.get('/companies/members').then(r => r.data);

// GET /companies/requests  (admin only)
export const getPendingJoinRequests = (): Promise<JoinRequest[]> =>
  client.get('/companies/requests').then(r => r.data);

// PUT /companies/requests/:id/approve
export const approveCompanyJoinRequest = (requestId: string): Promise<any> =>
  client.put(`/companies/requests/${requestId}/approve`).then(r => r.data);

// PUT /companies/requests/:id/reject
export const rejectCompanyJoinRequest = (requestId: string): Promise<any> =>
  client.put(`/companies/requests/${requestId}/reject`).then(r => r.data);
