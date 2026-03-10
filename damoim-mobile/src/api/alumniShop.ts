import apiClient from './axios';

export const SHOP_CATEGORIES: Record<string, string[]> = {
  '음식점': ['한식', '중식', '일식', '양식', '분식', '치킨', '피자', '패스트푸드', '뷔페', '기타'],
  '카페/디저트': ['카페', '베이커리', '디저트', '아이스크림', '기타'],
  '주점/바': ['호프/맥주', '소주방', '와인바', '칵테일바', '포차', '기타'],
  '뷰티/미용': ['헤어샵', '네일샵', '피부관리', '에스테틱', '기타'],
  '건강/의료': ['병원', '한의원', '치과', '약국', '안과', '기타'],
  '교육': ['학원', '과외', '어학원', '음악/미술', '체육', '기타'],
  '생활서비스': ['세탁', '수선', '인테리어', '이사/청소', '부동산', '기타'],
  '쇼핑/유통': ['의류', '신발/잡화', '편의점/마트', '꽃집', '기타'],
  '자동차': ['정비', '세차', '렌터카', '중고차', '기타'],
  'IT/전자': ['컴퓨터', '핸드폰', '인터넷', '기타'],
  '기타': ['기타'],
};

export const MAIN_CATEGORIES = Object.keys(SHOP_CATEGORIES);

export const CATEGORY_ICONS: Record<string, string> = {
  '음식점': '🍳', '카페/디저트': '🧁', '주점/바': '🍻', '뷰티/미용': '💇',
  '건강/의료': '💊', '교육': '✏️', '생활서비스': '🔨', '쇼핑/유통': '🛍️',
  '자동차': '🚙', 'IT/전자': '🖥️', '기타': '🎒',
};

// 만화 스타일 카테고리: 파스텔 배경색
export const CATEGORY_COLORS: Record<string, string> = {
  '음식점': '#FFE99A', '카페/디저트': '#FFD0D0', '주점/바': '#C5CAE9', '뷰티/미용': '#F8BBD0',
  '건강/의료': '#B8E6B8', '교육': '#FFF3D0', '생활서비스': '#FFE0B2', '쇼핑/유통': '#B3D4FC',
  '자동차': '#FFCCBC', 'IT/전자': '#D1C4E9', '기타': '#F0E0B0',
};

export interface OwnerSchoolDetail {
  schoolName: string;
  graduationYear?: string;
  grade?: string;
  classNumber?: string;
}

export interface ShopResponse {
  id: number;
  ownerUserId: string;
  ownerName: string;
  ownerProfileImageUrl?: string;
  ownerSchools: string[];
  ownerSchoolDetails?: OwnerSchoolDetail[];
  shopName: string;
  category: string;
  subCategory?: string;
  description?: string;
  address: string;
  detailAddress?: string;
  phone?: string;
  businessHours?: string;
  imageUrl?: string;
  averageRating?: number;
  reviewCount: number;
  createdAt: string;
}

export interface ShopReviewResponse {
  id: number;
  reviewerUserId: string;
  reviewerName: string;
  reviewerProfileImageUrl?: string;
  rating: number;
  content?: string;
  createdAt: string;
}

export const alumniShopAPI = {
  createShop: async (userId: string, data: {
    shopName: string; category: string; subCategory?: string; description?: string;
    address: string; detailAddress?: string; phone?: string; businessHours?: string; imageUrl?: string;
  }): Promise<ShopResponse> => {
    const response = await apiClient.post('/shops', data, { params: { userId } });
    return response.data;
  },

  getShops: async (userId: string, schoolCodes?: string): Promise<ShopResponse[]> => {
    const params: Record<string, string> = { userId };
    if (schoolCodes) params.schoolCodes = schoolCodes;
    const response = await apiClient.get('/shops', { params });
    return response.data;
  },

  getMyShops: async (userId: string): Promise<ShopResponse[]> => {
    const response = await apiClient.get('/shops/mine', { params: { userId } });
    return response.data;
  },

  getShopDetail: async (shopId: number): Promise<ShopResponse> => {
    const response = await apiClient.get(`/shops/${shopId}`);
    return response.data;
  },

  updateShop: async (shopId: number, userId: string, data: {
    shopName: string; category: string; subCategory?: string; description?: string;
    address: string; detailAddress?: string; phone?: string; businessHours?: string; imageUrl?: string;
  }): Promise<ShopResponse> => {
    const response = await apiClient.put(`/shops/${shopId}`, data, { params: { userId } });
    return response.data;
  },

  deleteShop: async (shopId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/shops/${shopId}`, { params: { userId } });
  },

  addReview: async (shopId: number, userId: string, rating: number, content: string): Promise<ShopReviewResponse> => {
    const response = await apiClient.post(`/shops/${shopId}/reviews`, { rating, content }, { params: { userId } });
    return response.data;
  },

  getReviews: async (shopId: number): Promise<ShopReviewResponse[]> => {
    const response = await apiClient.get(`/shops/${shopId}/reviews`);
    return response.data;
  },

  deleteReview: async (reviewId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/shops/reviews/${reviewId}`, { params: { userId } });
  },

  uploadImage: async (uri: string): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', { uri, name: filename, type } as any);
    const response = await apiClient.post('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },
};
