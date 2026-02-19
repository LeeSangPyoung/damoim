import axiosInstance from './axios';

export interface SchoolSearchResult {
  id: number;
  schoolCode: string;
  schoolName: string;
  schoolType: string;
  region: string;
  address: string;
  foundationType: string;
  foundDate: string;
  coeducation: string;
  highSchoolType: string;
  graduationYearFrom: number | null;
}

export interface SchoolStats {
  total: number;
  elementary: number;
  middle: number;
  high: number;
  special: number;
}

export const schoolAPI = {
  /**
   * 학교 검색 (자동완성)
   */
  search: async (keyword: string, schoolType?: string, region?: string): Promise<SchoolSearchResult[]> => {
    const params: Record<string, string> = { keyword };
    if (schoolType) params.schoolType = schoolType;
    if (region) params.region = region;
    const response = await axiosInstance.get('/schools/search', { params });
    return response.data;
  },

  /**
   * 학교 데이터 통계
   */
  getStats: async (): Promise<SchoolStats> => {
    const response = await axiosInstance.get('/schools/stats');
    return response.data;
  },

  /**
   * 수동 동기화
   */
  sync: async (): Promise<{ inserted: number; updated: number; failed: number; message: string }> => {
    const response = await axiosInstance.post('/schools/sync');
    return response.data;
  },
};
