import apiClient from './axios';

export interface FriendResponse {
  friendshipId: number;
  userId: string;
  name: string;
  profileImageUrl?: string;
  status: 'PENDING' | 'ACCEPTED';
  direction?: 'SENT' | 'RECEIVED';
  createdAt: string;
}

export interface FriendshipStatus {
  status: 'NONE' | 'FRIEND' | 'SENT' | 'RECEIVED';
  friendshipId?: number;
}

export const friendAPI = {
  sendRequest: async (userId: string, targetUserId: string): Promise<FriendResponse> => {
    const response = await apiClient.post('/friends/request', null, { params: { userId, targetUserId } });
    return response.data;
  },

  acceptRequest: async (friendshipId: number, userId: string): Promise<FriendResponse> => {
    const response = await apiClient.post(`/friends/${friendshipId}/accept`, null, { params: { userId } });
    return response.data;
  },

  removeFriendship: async (friendshipId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/friends/${friendshipId}`, { params: { userId } });
  },

  getMyFriends: async (userId: string): Promise<FriendResponse[]> => {
    const response = await apiClient.get('/friends', { params: { userId } });
    return response.data;
  },

  getSentRequests: async (userId: string): Promise<FriendResponse[]> => {
    const response = await apiClient.get('/friends/sent', { params: { userId } });
    return response.data;
  },

  getPendingRequests: async (userId: string): Promise<FriendResponse[]> => {
    const response = await apiClient.get('/friends/pending', { params: { userId } });
    return response.data;
  },

  getStatus: async (userId: string, targetUserId: string): Promise<FriendshipStatus> => {
    const response = await apiClient.get('/friends/status', { params: { userId, targetUserId } });
    return response.data;
  },

  getStatuses: async (userId: string, targetUserIds: string[]): Promise<Record<string, FriendshipStatus>> => {
    if (targetUserIds.length === 0) return {};
    const response = await apiClient.get('/friends/statuses', { params: { userId, targetUserIds: targetUserIds.join(',') } });
    return response.data;
  },
};
