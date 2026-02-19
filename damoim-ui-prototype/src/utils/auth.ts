import { AuthResponse } from '../api/auth';

export interface User {
  userId: string;
  name: string;
  email: string;
  role?: string;
}

export const saveAuthData = (authResponse: AuthResponse) => {
  localStorage.setItem('token', authResponse.token);
  localStorage.setItem('user', JSON.stringify({
    userId: authResponse.userId,
    name: authResponse.name,
    email: authResponse.email,
    role: authResponse.role || 'USER',
  }));
};

export const getAuthData = (): { token: string | null; user: User | null } => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user: User | null = userStr ? JSON.parse(userStr) : null;
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
