import apiClient from './axios';

export interface CreatePostRequest {
  content: string;
  imageUrls?: string[];
  schoolName?: string;
  graduationYear?: string;
  visibility?: string;
  targetGrade?: string;
  targetClassNumber?: string;
}

export interface UpdatePostRequest {
  content: string;
  imageUrls?: string[];
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: number; // 대댓글인 경우 부모 댓글 ID
  mentionedUserIds?: string[]; // @멘션된 사용자 ID 목록
}

export interface AuthorInfo {
  userId: string;
  name: string;
  profileImageUrl?: string;
  schoolName: string;
  graduationYear: string;
}

export interface CommentAuthorInfo {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

export interface MentionedUserInfo {
  userId: string;
  name: string;
}

export interface UserSearchResult {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

export interface PostResponse {
  id: number;
  author: AuthorInfo;
  content: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  liked: boolean;
  visibility?: string; // SCHOOL, GRADE, CLASS
  targetGrade?: string;
  targetClassNumber?: string;
}

export interface CommentResponse {
  id: number;
  postId: number;
  author: CommentAuthorInfo;
  content: string;
  createdAt: string;
  updatedAt?: string;
  canDelete: boolean;
  canEdit: boolean;
  parentCommentId?: number; // 대댓글인 경우 부모 댓글 ID
  replies: CommentResponse[]; // 대댓글 목록
  mentionedUsers: MentionedUserInfo[]; // @멘션된 사용자 목록
}

export const postAPI = {
  // 이미지 업로드
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },

  // 게시글 CRUD
  createPost: async (userId: string, request: CreatePostRequest): Promise<PostResponse> => {
    const response = await apiClient.post('/posts', request, { params: { userId } });
    return response.data;
  },

  getPosts: async (userId: string, filter: 'all' | 'myGrade' | 'myClass' = 'all', schoolName?: string, graduationYear?: string, grade?: string, classNumber?: string): Promise<PostResponse[]> => {
    const params: Record<string, string> = { userId, filter };
    if (schoolName) params.schoolName = schoolName;
    if (graduationYear) params.graduationYear = graduationYear;
    if (grade) params.grade = grade;
    if (classNumber) params.classNumber = classNumber;
    const response = await apiClient.get('/posts', { params });
    return response.data;
  },

  getPost: async (postId: number, userId: string): Promise<PostResponse> => {
    const response = await apiClient.get(`/posts/${postId}`, { params: { userId } });
    return response.data;
  },

  updatePost: async (postId: number, userId: string, request: UpdatePostRequest): Promise<PostResponse> => {
    const response = await apiClient.put(`/posts/${postId}`, request, { params: { userId } });
    return response.data;
  },

  deletePost: async (postId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/posts/${postId}`, { params: { userId } });
  },

  // 좋아요
  toggleLike: async (postId: number, userId: string): Promise<void> => {
    await apiClient.post(`/posts/${postId}/like`, null, { params: { userId } });
  },

  // 댓글
  addComment: async (postId: number, userId: string, request: CreateCommentRequest): Promise<CommentResponse> => {
    const response = await apiClient.post(`/posts/${postId}/comments`, request, { params: { userId } });
    return response.data;
  },

  getComments: async (postId: number, userId?: string): Promise<CommentResponse[]> => {
    const response = await apiClient.get(`/posts/${postId}/comments`, { params: { userId } });
    return response.data;
  },

  updateComment: async (commentId: number, userId: string, content: string): Promise<CommentResponse> => {
    const response = await apiClient.put(`/posts/comments/${commentId}`, { content }, { params: { userId } });
    return response.data;
  },

  deleteComment: async (commentId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/posts/comments/${commentId}`, { params: { userId } });
  },

  // 탭별 새 글 수 조회
  getNewPostCounts: async (userId: string, lastSeenAll: number, lastSeenMyGrade: number, lastSeenMyClass: number, schoolName?: string, graduationYear?: string): Promise<{ all: number; myGrade: number; myClass: number }> => {
    const response = await apiClient.get('/posts/new-counts', {
      params: { userId, lastSeenAll, lastSeenMyGrade, lastSeenMyClass, schoolName, graduationYear },
    });
    return response.data;
  },

  // 학교별 새 글 수 조회
  getNewPostCountForSchool: async (userId: string, schoolName: string, graduationYear: string): Promise<number> => {
    try {
      const response = await apiClient.get('/posts/new-count-by-school', {
        params: { userId, schoolName, graduationYear },
      });
      return response.data;
    } catch {
      return 0;
    }
  },

  // 사용자 검색 (멘션 자동완성용)
  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const response = await apiClient.get('/posts/search-users', { params: { query } });
    return response.data;
  },
};
