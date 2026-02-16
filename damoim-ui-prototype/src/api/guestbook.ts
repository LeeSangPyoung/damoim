import apiClient from './axios';

export interface GuestbookRequest {
  content: string;
}

export interface GuestbookWriterInfo {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

export interface GuestbookResponse {
  id: number;
  writer: GuestbookWriterInfo;
  content: string;
  createdAt: string;
  canDelete: boolean;
}

export const guestbookAPI = {
  // 방명록 작성
  addEntry: async (ownerUserId: string, writerId: string, request: GuestbookRequest): Promise<GuestbookResponse> => {
    const response = await apiClient.post(`/guestbook/${ownerUserId}`, request, { params: { writerId } });
    return response.data;
  },

  // 방명록 목록 조회
  getEntries: async (ownerUserId: string, currentUserId?: string): Promise<GuestbookResponse[]> => {
    const response = await apiClient.get(`/guestbook/${ownerUserId}`, { params: { currentUserId } });
    return response.data;
  },

  // 방명록 삭제
  deleteEntry: async (entryId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/guestbook/${entryId}`, { params: { userId } });
  },
};
