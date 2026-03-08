import apiClient from './axios';

export interface ChatRoomUserInfo {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

export interface ChatRoomResponse {
  id: number;
  otherUser: ChatRoomUserInfo;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface ChatMessageResponse {
  id: number;
  chatRoomId: number;
  senderUserId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  sentAt: string;
  completelyDeleted?: boolean;
  deletedBySender?: boolean;
}

export const chatAPI = {
  createOrGetRoom: async (userId: string, otherUserId: string): Promise<{ roomId: number }> => {
    const response = await apiClient.post('/chat/rooms', null, { params: { userId, otherUserId } });
    return response.data;
  },

  getMyChatRooms: async (userId: string): Promise<ChatRoomResponse[]> => {
    const response = await apiClient.get('/chat/rooms', { params: { userId } });
    return response.data;
  },

  getMessages: async (roomId: number, userId: string): Promise<ChatMessageResponse[]> => {
    const response = await apiClient.get(`/chat/rooms/${roomId}/messages`, { params: { userId } });
    return response.data;
  },

  sendMessage: async (roomId: number, userId: string, content: string): Promise<ChatMessageResponse> => {
    const response = await apiClient.post(`/chat/rooms/${roomId}/messages`, { content }, { params: { userId } });
    return response.data;
  },

  leaveRoom: async (roomId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/chat/rooms/${roomId}/leave`, { params: { userId } });
  },

  deleteMessage: async (messageId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/chat/messages/${messageId}`, { params: { userId } });
  },

  markRoomAsRead: async (roomId: number, userId: string): Promise<void> => {
    await apiClient.put(`/chat/rooms/${roomId}/read`, null, { params: { userId } });
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await apiClient.put('/chat/mark-all-read', null, { params: { userId } });
  },
};
