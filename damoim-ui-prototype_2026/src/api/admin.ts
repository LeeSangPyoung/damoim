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
  todayUsers: number;
  onlineUsers: number;
}

export interface AdminPost {
  id: number;
  authorUserId: string;
  authorName: string;
  content: string;
  schoolName: string;
  graduationYear: string;
  visibility: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  imageCount: number;
  createdAt: string;
}

export interface AdminComment {
  id: number;
  postId: number;
  postContentPreview: string;
  authorUserId: string;
  authorName: string;
  content: string;
  isReply: boolean;
  createdAt: string;
}

export interface AdminShop {
  id: number;
  shopName: string;
  category: string;
  subCategory: string;
  ownerUserId: string;
  ownerName: string;
  address: string;
  phone: string;
  reviewCount: number;
  avgRating: number | null;
  createdAt: string;
}

export interface AdminReunion {
  id: number;
  name: string;
  description: string;
  schoolName: string;
  graduationYear: string;
  inviteCode: string;
  createdByUserId: string;
  createdByName: string;
  memberCount: number;
  createdAt: string;
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
  // 통계
  getStats: async (adminId: string): Promise<AdminStats> => {
    const response = await apiClient.get('/admin/stats', { params: { adminId } });
    return response.data;
  },

  // 사용자
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

  // 게시글
  getAllPosts: async (adminId: string, keyword?: string): Promise<AdminPost[]> => {
    const response = await apiClient.get('/admin/posts', { params: { adminId, keyword } });
    return response.data;
  },
  deletePost: async (postId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/posts/${postId}`, { params: { adminId } });
  },

  // 댓글
  getAllComments: async (adminId: string, keyword?: string): Promise<AdminComment[]> => {
    const response = await apiClient.get('/admin/comments', { params: { adminId, keyword } });
    return response.data;
  },
  deleteComment: async (commentId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/comments/${commentId}`, { params: { adminId } });
  },

  // 동창가게
  getAllShops: async (adminId: string, keyword?: string): Promise<AdminShop[]> => {
    const response = await apiClient.get('/admin/shops', { params: { adminId, keyword } });
    return response.data;
  },
  deleteShop: async (shopId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/shops/${shopId}`, { params: { adminId } });
  },
  deleteShopReview: async (reviewId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/shop-reviews/${reviewId}`, { params: { adminId } });
  },

  // 찐모임
  getAllReunions: async (adminId: string, keyword?: string): Promise<AdminReunion[]> => {
    const response = await apiClient.get('/admin/reunions', { params: { adminId, keyword } });
    return response.data;
  },
  deleteReunion: async (reunionId: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/reunions/${reunionId}`, { params: { adminId } });
  },

  // 공지사항
  getAllAnnouncements: async (adminId: string): Promise<AnnouncementItem[]> => {
    const response = await apiClient.get('/admin/announcements', { params: { adminId } });
    return response.data;
  },
  getActiveAnnouncements: async (): Promise<AnnouncementItem[]> => {
    const response = await apiClient.get('/admin/announcements/active');
    return response.data;
  },
  createAnnouncement: async (adminId: string, title: string, content: string, intervalSeconds?: number): Promise<AnnouncementItem> => {
    const response = await apiClient.post('/admin/announcements', { title, content, intervalSeconds }, { params: { adminId } });
    return response.data;
  },
  updateAnnouncement: async (adminId: string, id: number, data: { title?: string; content?: string; active?: boolean; intervalSeconds?: number }): Promise<AnnouncementItem> => {
    const response = await apiClient.put(`/admin/announcements/${id}`, data, { params: { adminId } });
    return response.data;
  },
  deleteAnnouncement: async (id: number, adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/announcements/${id}`, { params: { adminId } });
  },
};
