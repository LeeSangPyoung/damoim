import { AuthResponse } from '../api/auth';

export const saveAuthData = (authResponse: AuthResponse) => {
  localStorage.setItem('token', authResponse.token);
  localStorage.setItem('user', JSON.stringify({
    userId: authResponse.userId,
    name: authResponse.name,
    email: authResponse.email,
  }));
};

export const getAuthData = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  return { token, user };
};

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};
