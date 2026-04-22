import client from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id?: string;
  avatar?: string;
  status?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface SignupResponse {
  token?: string;
  user?: AuthUser;
  message?: string;
  success?: boolean;
}

// POST /auth/login — returns { token, user }
export const login = (payload: LoginPayload): Promise<LoginResponse> =>
  client.post<LoginResponse>('/auth/login', payload).then(r => r.data);

// POST /auth/signup — may return { token, user } or just { message }
export const signup = (payload: SignupPayload): Promise<SignupResponse> =>
  client.post<SignupResponse>('/auth/signup', payload).then(r => r.data);

// GET /auth/me — returns current user profile
export const getCurrentUser = (): Promise<AuthUser> =>
  client.get<AuthUser>('/auth/me').then(r => r.data);
