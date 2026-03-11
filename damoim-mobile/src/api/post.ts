import { Platform } from 'react-native';
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
  visibility?: string;
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
  parentCommentId?: number;
  replies: CommentResponse[];
  mentionedUsers: MentionedUserInfo[];
}

export const postAPI = {
  uploadImage: async (uri: string): Promise<string> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const ext = blob.type?.split('/')?.[1] || 'jpeg';
      const filename = `photo_${Date.now()}.${ext}`;
      formData.append('file', blob, filename);
    } else {
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri, name: filename, type } as any);
    }

    const response = await apiClient.post('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },

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

  deletePost: async (postId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/posts/${postId}`, { params: { userId } });
  },

  toggleLike: async (postId: number, userId: string): Promise<void> => {
    await apiClient.post(`/posts/${postId}/like`, null, { params: { userId } });
  },

  addComment: async (postId: number, userId: string, content: string, parentCommentId?: number, mentionedUserIds?: string[]): Promise<CommentResponse> => {
    const response = await apiClient.post(`/posts/${postId}/comments`, { content, parentCommentId, mentionedUserIds }, { params: { userId } });
    return response.data;
  },

  getComments: async (postId: number, userId?: string): Promise<CommentResponse[]> => {
    const response = await apiClient.get(`/posts/${postId}/comments`, { params: { userId } });
    return response.data;
  },

  deleteComment: async (commentId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/posts/comments/${commentId}`, { params: { userId } });
  },

  updatePost: async (postId: number, userId: string, data: { content: string; imageUrls?: string[] }): Promise<PostResponse> => {
    const response = await apiClient.put(`/posts/${postId}`, data, { params: { userId } });
    return response.data;
  },

  updateComment: async (commentId: number, userId: string, content: string): Promise<CommentResponse> => {
    const response = await apiClient.put(`/posts/comments/${commentId}`, { content }, { params: { userId } });
    return response.data;
  },

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

  getNewCounts: async (userId: string, schoolName: string, graduationYear: string, lastSeenAll?: number, lastSeenMyGrade?: number, lastSeenMyClass?: number): Promise<{ all: number; myGrade: number; myClass: number }> => {
    try {
      const response = await apiClient.get('/posts/new-counts', {
        params: { userId, schoolName, graduationYear, lastSeenAll, lastSeenMyGrade, lastSeenMyClass },
      });
      return response.data;
    } catch {
      return { all: 0, myGrade: 0, myClass: 0 };
    }
  },

  searchUsersForMention: async (keyword: string, schoolName?: string, graduationYear?: string): Promise<{ userId: string; name: string }[]> => {
    const response = await apiClient.get('/posts/search-users', {
      params: { keyword, schoolName, graduationYear },
    });
    return response.data;
  },
};
