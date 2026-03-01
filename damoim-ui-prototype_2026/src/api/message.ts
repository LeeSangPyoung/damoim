import apiClient from './axios';

export interface MessageRequest {
  receiverId: string;
  content: string;
}

export interface UserInfo {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

export interface MessageResponse {
  id: number;
  sender: UserInfo;
  receiver: UserInfo;
  content: string;
  sentAt: string;
  readAt?: string;
  read: boolean;
}

export const messageAPI = {
  sendMessage: async (senderId: string, request: MessageRequest): Promise<MessageResponse> => {
    const response = await apiClient.post('/messages', request, {
      params: { senderId },
    });
    return response.data;
  },

  getReceivedMessages: async (userId: string): Promise<MessageResponse[]> => {
    const response = await apiClient.get('/messages/received', {
      params: { userId },
    });
    return response.data;
  },

  getSentMessages: async (userId: string): Promise<MessageResponse[]> => {
    const response = await apiClient.get('/messages/sent', {
      params: { userId },
    });
    return response.data;
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await apiClient.get('/messages/unread-count', {
      params: { userId },
    });
    return response.data;
  },

  markAsRead: async (messageId: number, userId: string): Promise<void> => {
    await apiClient.put(`/messages/${messageId}/read`, null, {
      params: { userId },
    });
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await apiClient.put('/messages/mark-all-read', null, {
      params: { userId },
    });
  },

  deleteMessage: async (messageId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/messages/${messageId}`, {
      params: { userId },
    });
  },
};
