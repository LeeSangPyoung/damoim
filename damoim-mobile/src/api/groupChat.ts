import apiClient from './axios';

export interface GroupMemberInfo {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

export interface GroupChatRoomResponse {
  id: number;
  name: string;
  createdBy?: string;
  memberCount: number;
  unreadCount?: number;
  members: GroupMemberInfo[];
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface GroupChatMessageResponse {
  id: number;
  roomId: number;
  senderUserId: string;
  senderName: string;
  content: string;
  messageType: string;
  attachmentUrl?: string;
  fileName?: string;
  fileSize?: number;
  unreadCount: number;
  sentAt: string;
  reactions?: { emoji: string; userId: string; userName: string }[];
}

export const groupChatAPI = {
  createRoom: async (userId: string, roomName: string, memberIds: string[]): Promise<GroupChatRoomResponse> => {
    const params = new URLSearchParams();
    params.append('userId', userId);
    params.append('roomName', roomName);
    memberIds.forEach(id => params.append('memberIds', id));
    const response = await apiClient.post(`/group-chat/rooms?${params.toString()}`, null);
    return response.data;
  },

  getMyRooms: async (userId: string): Promise<GroupChatRoomResponse[]> => {
    const response = await apiClient.get('/group-chat/rooms', { params: { userId } });
    return response.data;
  },

  getMessages: async (roomId: number, userId: string): Promise<GroupChatMessageResponse[]> => {
    const response = await apiClient.get(`/group-chat/rooms/${roomId}/messages`, { params: { userId } });
    return response.data;
  },

  sendMessage: async (roomId: number, userId: string, content: string, attachment?: {
    messageType: string;
    attachmentUrl: string;
    fileName: string;
    fileSize: number;
  }): Promise<GroupChatMessageResponse> => {
    const body: any = { content };
    if (attachment) {
      body.messageType = attachment.messageType;
      body.attachmentUrl = attachment.attachmentUrl;
      body.fileName = attachment.fileName;
      body.fileSize = attachment.fileSize;
    }
    const response = await apiClient.post(`/group-chat/rooms/${roomId}/messages`, body, { params: { userId } });
    return response.data;
  },

  inviteMember: async (roomId: number, userId: string, newMemberId: string): Promise<void> => {
    await apiClient.post(`/group-chat/rooms/${roomId}/invite`, null, { params: { userId, newMemberId } });
  },

  leaveRoom: async (roomId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/group-chat/rooms/${roomId}/leave`, { params: { userId } });
  },

  kickMember: async (roomId: number, userId: string, targetUserId: string): Promise<void> => {
    await apiClient.delete(`/group-chat/rooms/${roomId}/kick`, { params: { userId, targetUserId } });
  },

  deleteMessage: async (messageId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/group-chat/messages/${messageId}`, { params: { userId } });
  },
};
