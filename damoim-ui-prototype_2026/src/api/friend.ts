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
  // 친구 요청 보내기
  sendRequest: async (userId: string, targetUserId: string): Promise<FriendResponse> => {
    const response = await apiClient.post('/friends/request', null, {
      params: { userId, targetUserId },
    });
    return response.data;
  },

  // 친구 요청 수락
  acceptRequest: async (friendshipId: number, userId: string): Promise<FriendResponse> => {
    const response = await apiClient.post(`/friends/${friendshipId}/accept`, null, {
      params: { userId },
    });
    return response.data;
  },

  // 친구 삭제 / 요청 거절
  removeFriendship: async (friendshipId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/friends/${friendshipId}`, {
      params: { userId },
    });
  },

  // 내 친구 목록
  getMyFriends: async (userId: string): Promise<FriendResponse[]> => {
    const response = await apiClient.get('/friends', {
      params: { userId },
    });
    return response.data;
  },

  // 보낸 친구 요청 목록
  getSentRequests: async (userId: string): Promise<FriendResponse[]> => {
    const response = await apiClient.get('/friends/sent', {
      params: { userId },
    });
    return response.data;
  },

  // 받은 친구 요청 목록
  getPendingRequests: async (userId: string): Promise<FriendResponse[]> => {
    const response = await apiClient.get('/friends/pending', {
      params: { userId },
    });
    return response.data;
  },

  // 두 사용자 간 친구 상태 확인
  getStatus: async (userId: string, targetUserId: string): Promise<FriendshipStatus> => {
    const response = await apiClient.get('/friends/status', {
      params: { userId, targetUserId },
    });
    return response.data;
  },

  // 일괄 친구 상태 조회
  getStatuses: async (userId: string, targetUserIds: string[]): Promise<Record<string, FriendshipStatus>> => {
    if (targetUserIds.length === 0) return {};
    const response = await apiClient.get('/friends/statuses', {
      params: { userId, targetUserIds: targetUserIds.join(',') },
    });
    return response.data;
  },
};
