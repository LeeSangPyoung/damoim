import apiClient from './axios';

export interface SchoolInfo {
  id: number;
  schoolCode?: string;
  schoolType: string;
  schoolName: string;
  graduationYear: string;
  grade?: string;
  classNumber?: string;
}

export interface ProfileResponse {
  id: number;
  userId: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  bio?: string;
  schools: SchoolInfo[];
}

export interface SchoolUpdateInfo {
  schoolCode?: string;
  schoolType: string;
  schoolName: string;
  graduationYear: string;
  grade?: string;
  classNumber?: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  profileImageUrl?: string;
  bio?: string;
  schools?: SchoolUpdateInfo[];
}

export interface ClassmateInfo {
  id: number;
  userId: string;
  name: string;
  profileImageUrl?: string;
  bio?: string;
  school: {
    schoolCode?: string;
    schoolType: string;
    schoolName: string;
    graduationYear: string;
    grade?: string;
    classNumber?: string;
  };
}

export interface ClassmateSearchResponse {
  classmates: ClassmateInfo[];
  totalCount: number;
}

export interface UserSearchParams {
  currentUserId: string;
  name?: string;
  schoolName?: string;
  graduationYear?: string;
  grade?: string;
  classNumber?: string;
}

export const userAPI = {
  getProfile: async (userId: string): Promise<ProfileResponse> => {
    const response = await apiClient.get(`/users/${userId}/profile`);
    return response.data;
  },

  updateProfile: async (userId: string, data: ProfileUpdateRequest): Promise<ProfileResponse> => {
    const response = await apiClient.put(`/users/${userId}/profile`, data);
    return response.data;
  },

  searchClassmates: async (
    userId: string,
    schoolCode: string,
    graduationYear: string
  ): Promise<ClassmateSearchResponse> => {
    const response = await apiClient.get(`/users/${userId}/classmates`, {
      params: { schoolCode, graduationYear },
    });
    return response.data;
  },

  searchUsers: async (params: UserSearchParams): Promise<ClassmateSearchResponse> => {
    const response = await apiClient.get('/users/search', { params });
    return response.data;
  },
};
