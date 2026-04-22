import { useAuthStore } from '../store/authStore';
import { login as apiLogin, logout as apiLogout, SignupPayload, LoginPayload } from '../api/auth';
import { signup as apiSignup } from '../api/auth';

export const useAuth = () => {
  const { token, user, setToken, setUser, clearAuth } = useAuthStore();

  const login = async (payload: LoginPayload) => {
    const data = await apiLogin(payload);
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const signup = async (payload: SignupPayload) => {
    const data = await apiSignup(payload);
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      clearAuth();
    }
  };

  return { token, user, login, signup, logout, isAuthenticated: !!token };
};
