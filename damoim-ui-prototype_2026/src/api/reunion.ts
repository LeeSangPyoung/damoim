import apiClient from './axios';

export interface ReunionMemberInfo {
  memberId: number;
  userId: string;
  name: string;
  profileImageUrl?: string;
  role: 'LEADER' | 'TREASURER' | 'MEMBER' | 'ADMIN';
  joinedAt: string;
}

export interface ReunionResponse {
  id: number;
  name: string;
  description?: string;
  schoolCode?: string;
  schoolName?: string;
  graduationYear?: string;
  coverImageUrl?: string;
  inviteCode?: string;
  createdByUserId: string;
  createdByName: string;
  memberCount: number;
  members: ReunionMemberInfo[];
  createdAt: string;
  myRole?: 'LEADER' | 'TREASURER' | 'MEMBER' | 'ADMIN';
}

export interface VoterInfo {
  userId: string;
  name: string;
}

export interface VoteOptionInfo {
  id: number;
  type: 'DATE' | 'LOCATION';
  optionValue: string;
  voteCount: number;
  voters: VoterInfo[];
  myVote: boolean;
}

export interface MeetingResponse {
  id: number;
  reunionId: number;
  title: string;
  description?: string;
  status: 'VOTING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  finalDate?: string;
  finalLocation?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  dateOptions: VoteOptionInfo[];
  locationOptions: VoteOptionInfo[];
}

export interface FeeResponse {
  id: number;
  reunionId: number;
  feeGroupId?: number;
  userId: string;
  userName: string;
  amount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PAID' | 'PARTIAL';
  description?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

export interface FeeSummaryResponse {
  totalAmount: number;
  totalPaid: number;
  totalUnpaid: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
}

export interface FeeGroupResponse {
  id: number;
  reunionId: number;
  description: string;
  amountPerMember: number;
  dueDate?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  totalMembers: number;
  paidCount: number;
  unpaidCount: number;
  totalAmount: number;
  totalPaid: number;
  fees: FeeResponse[];
}

export interface JoinRequestResponse {
  id: number;
  reunionId: number;
  userId: string;
  userName: string;
  profileImageUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  processedAt?: string;
}

export interface ReunionPostResponse {
  id: number;
  reunionId: number;
  authorUserId: string;
  authorName: string;
  authorProfileImageUrl?: string;
  content: string;
  imageUrls: string[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  liked: boolean;
}

export interface ReunionCommentResponse {
  id: number;
  postId: number;
  authorUserId: string;
  authorName: string;
  authorProfileImageUrl?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  canEdit: boolean;
  canDelete: boolean;
  parentCommentId?: number;
  replies: ReunionCommentResponse[];
}

export const reunionAPI = {
  // 모임
  createReunion: async (userId: string, data: {
    name: string;
    description?: string;
    schoolCode?: string;
    schoolName?: string;
    graduationYear?: string;
    coverImageUrl?: string;
    memberIds: string[];
  }): Promise<ReunionResponse> => {
    const response = await apiClient.post('/reunions', data, { params: { userId } });
    return response.data;
  },

  getMyReunions: async (userId: string): Promise<ReunionResponse[]> => {
    const response = await apiClient.get('/reunions', { params: { userId } });
    return response.data;
  },

  getReunionDetail: async (reunionId: number, userId: string): Promise<ReunionResponse> => {
    const response = await apiClient.get(`/reunions/${reunionId}`, { params: { userId } });
    return response.data;
  },

  inviteMembers: async (reunionId: number, userId: string, memberIds: string[]): Promise<void> => {
    const params = new URLSearchParams();
    params.append('userId', userId);
    memberIds.forEach(id => params.append('memberIds', id));
    await apiClient.post(`/reunions/${reunionId}/invite?${params.toString()}`, null);
  },

  leaveReunion: async (reunionId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/reunions/${reunionId}/leave`, { params: { userId } });
  },

  removeMember: async (reunionId: number, userId: string, targetUserId: string): Promise<void> => {
    await apiClient.delete(`/reunions/${reunionId}/members/${targetUserId}`, { params: { userId } });
  },

  // 초대코드 가입
  joinByCode: async (userId: string, inviteCode: string): Promise<ReunionResponse> => {
    const response = await apiClient.post('/reunions/join-by-code', null, {
      params: { userId, inviteCode }
    });
    return response.data;
  },

  // 가입 신청 관리
  getJoinRequests: async (reunionId: number, userId: string): Promise<JoinRequestResponse[]> => {
    const response = await apiClient.get(`/reunions/${reunionId}/join-requests`, {
      params: { userId }
    });
    return response.data;
  },

  approveJoinRequest: async (requestId: number, userId: string): Promise<void> => {
    await apiClient.put(`/reunions/join-requests/${requestId}/approve`, null, {
      params: { userId }
    });
  },

  rejectJoinRequest: async (requestId: number, userId: string): Promise<void> => {
    await apiClient.put(`/reunions/join-requests/${requestId}/reject`, null, {
      params: { userId }
    });
  },

  regenerateInviteCode: async (reunionId: number, userId: string): Promise<string> => {
    const response = await apiClient.put(`/reunions/${reunionId}/regenerate-code`, null, {
      params: { userId }
    });
    return response.data.inviteCode;
  },

  // 피드
  createPost: async (reunionId: number, userId: string, data: {
    content: string;
    imageUrls?: string[];
  }): Promise<ReunionPostResponse> => {
    const response = await apiClient.post(`/reunions/${reunionId}/posts`, data, {
      params: { userId }
    });
    return response.data;
  },

  getPosts: async (reunionId: number, userId: string): Promise<ReunionPostResponse[]> => {
    const response = await apiClient.get(`/reunions/${reunionId}/posts`, {
      params: { userId }
    });
    return response.data;
  },

  deletePost: async (postId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/reunions/posts/${postId}`, { params: { userId } });
  },

  // 좋아요
  togglePostLike: async (postId: number, userId: string): Promise<void> => {
    await apiClient.post(`/reunions/posts/${postId}/like`, null, { params: { userId } });
  },

  // 댓글
  getComments: async (postId: number, userId: string): Promise<ReunionCommentResponse[]> => {
    const response = await apiClient.get(`/reunions/posts/${postId}/comments`, { params: { userId } });
    return response.data;
  },

  addComment: async (postId: number, userId: string, content: string, parentCommentId?: number): Promise<ReunionCommentResponse> => {
    const response = await apiClient.post(`/reunions/posts/${postId}/comments`, { content, parentCommentId }, { params: { userId } });
    return response.data;
  },

  updateComment: async (commentId: number, userId: string, content: string): Promise<ReunionCommentResponse> => {
    const response = await apiClient.put(`/reunions/comments/${commentId}`, { content }, { params: { userId } });
    return response.data;
  },

  deleteComment: async (commentId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/reunions/comments/${commentId}`, { params: { userId } });
  },

  // 이미지 업로드 (기존 포스트 업로드 재사용)
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.url;
  },

  // 모임
  createMeeting: async (reunionId: number, userId: string, data: {
    title: string;
    description?: string;
    dateOptions: string[];
    locationOptions: string[];
  }): Promise<MeetingResponse> => {
    const response = await apiClient.post(`/reunions/${reunionId}/meetings`, data, { params: { userId } });
    return response.data;
  },

  getMeetings: async (reunionId: number, userId: string): Promise<MeetingResponse[]> => {
    const response = await apiClient.get(`/reunions/${reunionId}/meetings`, { params: { userId } });
    return response.data;
  },

  vote: async (optionId: number, userId: string): Promise<MeetingResponse> => {
    const response = await apiClient.post(`/reunions/meetings/vote/${optionId}`, null, { params: { userId } });
    return response.data;
  },

  confirmMeeting: async (meetingId: number, userId: string, finalDate: string, finalLocation: string): Promise<void> => {
    await apiClient.put(`/reunions/meetings/${meetingId}/confirm`, null, {
      params: { userId, finalDate, finalLocation }
    });
  },

  cancelMeeting: async (meetingId: number, userId: string): Promise<void> => {
    await apiClient.put(`/reunions/meetings/${meetingId}/cancel`, null, { params: { userId } });
  },

  // 회비
  createFees: async (reunionId: number, userId: string, data: {
    amount: number;
    description?: string;
    dueDate?: string;
  }): Promise<FeeResponse[]> => {
    const response = await apiClient.post(`/reunions/${reunionId}/fees`, data, { params: { userId } });
    return response.data;
  },

  getFees: async (reunionId: number, userId: string): Promise<FeeResponse[]> => {
    const response = await apiClient.get(`/reunions/${reunionId}/fees`, { params: { userId } });
    return response.data;
  },

  getFeeSummary: async (reunionId: number, userId: string): Promise<FeeSummaryResponse> => {
    const response = await apiClient.get(`/reunions/${reunionId}/fees/summary`, { params: { userId } });
    return response.data;
  },

  updateFeePayment: async (feeId: number, userId: string, paidAmount: number): Promise<FeeResponse> => {
    const response = await apiClient.put(`/reunions/fees/${feeId}/pay`, null, {
      params: { userId, paidAmount }
    });
    return response.data;
  },

  // 회비 그룹
  getFeeGroups: async (reunionId: number, userId: string): Promise<FeeGroupResponse[]> => {
    const response = await apiClient.get(`/reunions/${reunionId}/fee-groups`, { params: { userId } });
    return response.data;
  },

  toggleFeePayment: async (feeId: number, userId: string): Promise<FeeResponse> => {
    const response = await apiClient.put(`/reunions/fees/${feeId}/toggle-paid`, null, { params: { userId } });
    return response.data;
  },

  addMemberToFeeGroup: async (feeGroupId: number, userId: string, targetUserId: string): Promise<FeeResponse> => {
    const response = await apiClient.post(`/reunions/fee-groups/${feeGroupId}/members`, null, {
      params: { userId, targetUserId }
    });
    return response.data;
  },

  removeMemberFromFeeGroup: async (feeGroupId: number, userId: string, targetUserId: string): Promise<void> => {
    await apiClient.delete(`/reunions/fee-groups/${feeGroupId}/members/${targetUserId}`, { params: { userId } });
  },

  deleteFeeGroup: async (feeGroupId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/reunions/fee-groups/${feeGroupId}`, { params: { userId } });
  },

  // 총무 관리
  assignTreasurer: async (reunionId: number, userId: string, targetUserId: string): Promise<void> => {
    await apiClient.put(`/reunions/${reunionId}/treasurer`, null, {
      params: { userId, targetUserId }
    });
  },

  removeTreasurer: async (reunionId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/reunions/${reunionId}/treasurer`, { params: { userId } });
  },
};
