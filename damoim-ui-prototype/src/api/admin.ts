import apiClient from './axios';

export interface UserManagement {
  id: number;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginTime?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalPosts: number;
  totalComments: number;
}

export const adminAPI = {
  // 전체 사용자 목록
  getAllUsers: async (adminId: string): Promise<UserManagement[]> => {
    const response = await apiClient.get('/admin/users', { params: { adminId } });
    return response.data;
  },

  // 사용자 검색
  searchUsers: async (adminId: string, keyword?: string): Promise<UserManagement[]> => {
    const response = await apiClient.get('/admin/users/search', {
      params: { adminId, keyword }
    });
    return response.data;
  },

  // 사용자 정지
  suspendUser: async (userId: string, adminId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/suspend`, null, { params: { adminId } });
  },

  // 사용자 정지 해제
  unsuspendUser: async (userId: string, adminId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/unsuspend`, null, { params: { adminId } });
  },

  // 사용자 역할 변경
  changeUserRole: async (userId: string, role: string, adminId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/role`, null, {
      params: { role, adminId }
    });
  },

  // 게시글 삭제
  deletePost: async (postId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/posts/${postId}`, { params: { adminId } });
  },

  // 댓글 삭제
  deleteComment: async (commentId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/comments/${commentId}`, { params: { adminId } });
  },

  // 통계 조회
  getStats: async (adminId: string): Promise<AdminStats> => {
    const response = await apiClient.get('/admin/stats', { params: { adminId } });
    return response.data;
  },
};
