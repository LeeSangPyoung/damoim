import apiClient from './axios';
import { Platform } from 'react-native';

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

export interface ReactionInfo {
  emoji: string;
  userId: string;
  userName: string;
}

export interface ChatMessageResponse {
  id: number;
  chatRoomId: number;
  senderUserId: string;
  senderName: string;
  content: string;
  messageType?: string;      // TEXT, IMAGE, FILE
  attachmentUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  sentAt: string;
  completelyDeleted?: boolean;
  deletedBySender?: boolean;
  reactions?: ReactionInfo[];
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

  getMessages: async (roomId: number, userId: string, markRead: boolean = true): Promise<ChatMessageResponse[]> => {
    const response = await apiClient.get(`/chat/rooms/${roomId}/messages`, { params: { userId, markRead } });
    return response.data;
  },

  sendMessage: async (roomId: number, userId: string, content: string, attachment?: {
    messageType: string;
    attachmentUrl: string;
    fileName: string;
    fileSize: number;
  }): Promise<ChatMessageResponse> => {
    const body: any = { content };
    if (attachment) {
      body.messageType = attachment.messageType;
      body.attachmentUrl = attachment.attachmentUrl;
      body.fileName = attachment.fileName;
      body.fileSize = attachment.fileSize;
    }
    const response = await apiClient.post(`/chat/rooms/${roomId}/messages`, body, { params: { userId } });
    return response.data;
  },

  uploadFile: async (uri: string, fileName?: string): Promise<{
    url: string;
    fileName: string;
    fileSize: number;
    messageType: string;
  }> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: data URI → blob
      const res = await fetch(uri);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const name = fileName || `file_${Date.now()}.${ext}`;
      formData.append('file', blob, name);
    } else {
      const name = fileName || uri.split('/').pop() || `file_${Date.now()}`;
      formData.append('file', { uri, name, type: 'application/octet-stream' } as any);
    }

    const response = await apiClient.post('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  toggleReaction: async (userId: string, messageId: number, source: string, emoji: string): Promise<{ action: string }> => {
    const response = await apiClient.post('/chat/reactions', null, {
      params: { userId, messageId, source, emoji },
    });
    return response.data;
  },

  sendTyping: async (roomId: number, userId: string, typing: boolean = true): Promise<void> => {
    await apiClient.post(`/chat/rooms/${roomId}/typing`, null, { params: { userId, typing } });
  },

  getTypingStatus: async (roomId: number, userId: string): Promise<{ typingUsers: string[] }> => {
    const response = await apiClient.get(`/chat/rooms/${roomId}/typing`, { params: { userId } });
    return response.data;
  },
};
