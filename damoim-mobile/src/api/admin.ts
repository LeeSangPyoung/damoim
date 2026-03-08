import apiClient from './axios';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalPosts: number;
  totalComments: number;
  todayUsers: number;
  onlineUsers: number;
}

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

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  active: boolean;
  intervalSeconds: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export const adminAPI = {
  getStats: async (adminId: string): Promise<AdminStats> => {
    const response = await apiClient.get('/admin/stats', { params: { adminId } });
    return response.data;
  },

  getAllUsers: async (adminId: string): Promise<UserManagement[]> => {
    const response = await apiClient.get('/admin/users', { params: { adminId } });
    return response.data;
  },

  searchUsers: async (adminId: string, keyword?: string): Promise<UserManagement[]> => {
    const response = await apiClient.get('/admin/users/search', { params: { adminId, keyword } });
    return response.data;
  },

  suspendUser: async (userId: string, adminId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/suspend`, null, { params: { adminId } });
  },

  unsuspendUser: async (userId: string, adminId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/unsuspend`, null, { params: { adminId } });
  },

  changeUserRole: async (userId: string, role: string, adminId: string): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/role`, null, { params: { role, adminId } });
  },

  getActiveAnnouncements: async (): Promise<AnnouncementItem[]> => {
    const response = await apiClient.get('/admin/announcements/active');
    return response.data;
  },

  createAnnouncement: async (adminId: string, title: string, content: string, intervalSeconds?: number): Promise<AnnouncementItem> => {
    const response = await apiClient.post('/admin/announcements', { title, content, intervalSeconds }, { params: { adminId } });
    return response.data;
  },

  updateAnnouncement: async (id: number, adminId: string, data: { title?: string; content?: string; active?: boolean; intervalSeconds?: number }): Promise<AnnouncementItem> => {
    const response = await apiClient.put(`/admin/announcements/${id}`, data, { params: { adminId } });
    return response.data;
  },

  deleteAnnouncement: async (id: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/announcements/${id}`, { params: { adminId } });
  },

  getAllAnnouncements: async (adminId: string): Promise<AnnouncementItem[]> => {
    const response = await apiClient.get('/admin/announcements', { params: { adminId } });
    return response.data;
  },

  getAdminPosts: async (adminId: string, keyword?: string): Promise<any[]> => {
    const response = await apiClient.get('/admin/posts', { params: { adminId, keyword } });
    return response.data;
  },

  deleteAdminPost: async (postId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/posts/${postId}`, { params: { adminId } });
  },

  getAdminComments: async (adminId: string, keyword?: string): Promise<any[]> => {
    const response = await apiClient.get('/admin/comments', { params: { adminId, keyword } });
    return response.data;
  },

  deleteAdminComment: async (commentId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/comments/${commentId}`, { params: { adminId } });
  },

  getAdminShops: async (adminId: string, keyword?: string): Promise<any[]> => {
    const response = await apiClient.get('/admin/shops', { params: { adminId, keyword } });
    return response.data;
  },

  deleteAdminShop: async (shopId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/shops/${shopId}`, { params: { adminId } });
  },

  deleteAdminShopReview: async (reviewId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/shop-reviews/${reviewId}`, { params: { adminId } });
  },

  getAdminReunions: async (adminId: string, keyword?: string): Promise<any[]> => {
    const response = await apiClient.get('/admin/reunions', { params: { adminId, keyword } });
    return response.data;
  },

  deleteAdminReunion: async (reunionId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/reunions/${reunionId}`, { params: { adminId } });
  },
};
