import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// 업종 카테고리 계층 구조
export const SHOP_CATEGORIES: Record<string, string[]> = {
  '음식점':      ['한식', '중식', '일식', '양식', '분식', '치킨', '피자', '패스트푸드', '뷔페', '기타'],
  '카페/디저트':  ['카페', '베이커리', '디저트', '아이스크림', '기타'],
  '주점/바':     ['호프/맥주', '소주방', '와인바', '칵테일바', '포차', '기타'],
  '뷰티/미용':   ['헤어샵', '네일샵', '피부관리', '에스테틱', '기타'],
  '건강/의료':   ['병원', '한의원', '치과', '약국', '안과', '기타'],
  '교육':       ['학원', '과외', '어학원', '음악/미술', '체육', '기타'],
  '생활서비스':   ['세탁', '수선', '인테리어', '이사/청소', '부동산', '기타'],
  '쇼핑/유통':   ['의류', '신발/잡화', '편의점/마트', '꽃집', '기타'],
  '자동차':      ['정비', '세차', '렌터카', '중고차', '기타'],
  'IT/전자':     ['컴퓨터', '핸드폰', '인터넷', '기타'],
  '기타':        ['기타'],
};

export const MAIN_CATEGORIES = Object.keys(SHOP_CATEGORIES);

export const CATEGORY_ICONS: Record<string, string> = {
  '음식점': '🍽️', '카페/디저트': '☕', '주점/바': '🍺', '뷰티/미용': '✂️',
  '건강/의료': '🏥', '교육': '📚', '생활서비스': '🔧', '쇼핑/유통': '🛒',
  '자동차': '🚗', 'IT/전자': '💻', '기타': '🏪',
};

export interface ShopResponse {
  id: number;
  ownerUserId: string;
  ownerName: string;
  ownerProfileImageUrl?: string;
  ownerSchools: string[];
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
  // 가게 등록
  createShop: async (userId: string, data: {
    shopName: string;
    category: string;
    subCategory?: string;
    description?: string;
    address: string;
    detailAddress?: string;
    phone?: string;
    businessHours?: string;
    imageUrl?: string;
  }): Promise<ShopResponse> => {
    const response = await apiClient.post('/shops', data, { params: { userId } });
    return response.data;
  },

  // 내 학교 동창 가게 목록 (schoolCodes: 쉼표 구분 학교 코드)
  getShops: async (userId: string, schoolCodes?: string): Promise<ShopResponse[]> => {
    const params: Record<string, string> = { userId };
    if (schoolCodes) params.schoolCodes = schoolCodes;
    const response = await apiClient.get('/shops', { params });
    return response.data;
  },

  // 내가 등록한 가게
  getMyShops: async (userId: string): Promise<ShopResponse[]> => {
    const response = await apiClient.get('/shops/mine', { params: { userId } });
    return response.data;
  },

  // 가게 상세
  getShopDetail: async (shopId: number): Promise<ShopResponse> => {
    const response = await apiClient.get(`/shops/${shopId}`);
    return response.data;
  },

  // 가게 수정
  updateShop: async (shopId: number, userId: string, data: {
    shopName: string;
    category: string;
    subCategory?: string;
    description?: string;
    address: string;
    detailAddress?: string;
    phone?: string;
    businessHours?: string;
    imageUrl?: string;
  }): Promise<ShopResponse> => {
    const response = await apiClient.put(`/shops/${shopId}`, data, { params: { userId } });
    return response.data;
  },

  // 가게 삭제
  deleteShop: async (shopId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/shops/${shopId}`, { params: { userId } });
  },

  // 후기 작성
  addReview: async (shopId: number, userId: string, rating: number, content: string): Promise<ShopReviewResponse> => {
    const response = await apiClient.post(`/shops/${shopId}/reviews`, { rating, content }, { params: { userId } });
    return response.data;
  },

  // 후기 목록
  getReviews: async (shopId: number): Promise<ShopReviewResponse[]> => {
    const response = await apiClient.get(`/shops/${shopId}/reviews`);
    return response.data;
  },

  // 후기 삭제
  deleteReview: async (reviewId: number, userId: string): Promise<void> => {
    await apiClient.delete(`/shops/reviews/${reviewId}`, { params: { userId } });
  },

  // 이미지 업로드
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },
};
