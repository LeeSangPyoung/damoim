import apiClient from './axios';

export interface NotificationResponse {
  id: number;
  senderUserId: string;
  senderName: string;
  type: 'MESSAGE' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'COMMENT' | 'LIKE' | 'CHAT' | 'GROUP_CHAT' | 'REUNION_INVITE' | 'MEETING_CREATED' | 'MEETING_CONFIRMED' | 'MEETING_CANCELLED' | 'FEE_CREATED' | 'FEE_UPDATED' | 'REUNION_JOIN_REQUEST' | 'REUNION_JOIN_APPROVED' | 'REUNION_JOIN_REJECTED' | 'REUNION_POST';
  content: string;
  referenceId?: number;
  read: boolean;
  createdAt: string;
}

export const notificationAPI = {
  getNotifications: async (userId: string): Promise<NotificationResponse[]> => {
    const response = await apiClient.get('/notifications', {
      params: { userId },
    });
    return response.data;
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count', {
      params: { userId },
    });
    return response.data;
  },

  markAsRead: async (notificationId: number, userId: string): Promise<void> => {
    await apiClient.put(`/notifications/${notificationId}/read`, null, {
      params: { userId },
    });
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await apiClient.put('/notifications/read-all', null, {
      params: { userId },
    });
  },
};
