import apiClient from './axios';

export interface SchoolInfo {
  schoolType: string;
  schoolName: string;
  graduationYear: string;
  grade?: string;
  classNumber?: string;
}

export interface SignupData {
  userId: string;
  password: string;
  name: string;
  email: string;
  schools: SchoolInfo[];
}

export interface LoginData {
  userId: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  name: string;
  email: string;
  role?: string;
}

export interface FindIdResponse {
  maskedUserId: string;
}

export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  findId: async (data: { name: string; email: string }): Promise<FindIdResponse> => {
    const response = await apiClient.post<FindIdResponse>('/auth/find-id', data);
    return response.data;
  },

  verifyIdentity: async (data: { userId: string; email: string }): Promise<void> => {
    await apiClient.post('/auth/verify-identity', data);
  },

  resetPassword: async (data: { userId: string; email: string; newPassword: string }): Promise<void> => {
    await apiClient.post('/auth/reset-password', data);
  },

  logout: async (userId: string): Promise<void> => {
    await apiClient.post('/auth/logout', { userId });
  },

  heartbeat: async (userId: string): Promise<void> => {
    await apiClient.post('/auth/heartbeat', { userId });
  },
};
