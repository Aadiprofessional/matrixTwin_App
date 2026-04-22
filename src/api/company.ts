import client from './client';

export interface AdminRequestPayload {
  company_name: string;
  company_details: {
    address?: string;
    phone?: string;
    website?: string;
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
  };
  created_at: string;
}

export interface JoinRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: { id: string; name: string; email: string; avatar?: string };
  company?: { id: string; name: string };
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
export const getCompany = (companyId: string): Promise<any> =>
  client.get(`/companies/${companyId}`).then(r => r.data);

// GET /companies/members
export const getCompanyMembers = (): Promise<any[]> =>
  client.get('/companies/members').then(r => r.data);

// GET /companies/requests  (admin only)
export const getPendingJoinRequests = (): Promise<JoinRequest[]> =>
  client.get('/companies/requests').then(r => r.data);

// PUT /companies/requests/:id/approve
export const approveJoinRequest = (requestId: string): Promise<any> =>
  client.put(`/companies/requests/${requestId}/approve`).then(r => r.data);

// PUT /companies/requests/:id/reject
export const rejectJoinRequest = (requestId: string): Promise<any> =>
  client.put(`/companies/requests/${requestId}/reject`).then(r => r.data);
