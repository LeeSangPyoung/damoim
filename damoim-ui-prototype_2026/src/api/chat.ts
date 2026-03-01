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
  // 채팅방 생성/조회
  createOrGetRoom: async (userId: string, otherUserId: string): Promise<{ roomId: number }> => {
    const response = await apiClient.post('/chat/rooms', null, { params: { userId, otherUserId } });
    return response.data;
  },

  // 내 채팅방 목록
  getMyChatRooms: async (userId: string): Promise<ChatRoomResponse[]> => {
    const response = await apiClient.get('/chat/rooms', { params: { userId } });
    return response.data;
  },

  // 메시지 목록 조회
  getMessages: async (roomId: number, userId: string): Promise<ChatMessageResponse[]> => {
    const response = await apiClient.get(`/chat/rooms/${roomId}/messages`, { params: { userId } });
    return response.data;
  },

  // 메시지 전송 (REST)
  sendMessage: async (roomId: number, userId: string, content: string): Promise<ChatMessageResponse> => {
    const response = await apiClient.post(`/chat/rooms/${roomId}/messages`, { content }, { params: { userId } });
    return response.data;
  },

  // 채팅방 나가기
  leaveRoom: async (roomId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/chat/rooms/${roomId}/leave`, { params: { userId } });
  },

  // 메시지 삭제 (카카오톡 스타일)
  deleteMessage: async (messageId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/chat/messages/${messageId}`, { params: { userId } });
  },

  // 모든 채팅방 메시지 일괄 읽음 처리
  markAllAsRead: async (userId: string): Promise<void> => {
    await apiClient.put('/chat/mark-all-read', null, { params: { userId } });
  },
};
