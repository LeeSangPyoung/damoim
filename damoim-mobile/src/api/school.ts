import apiClient from './axios';

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

export const schoolAPI = {
  search: async (keyword: string, schoolType?: string): Promise<SchoolSearchResult[]> => {
    const params: Record<string, string> = { keyword };
    if (schoolType) params.schoolType = schoolType;
    const response = await apiClient.get('/schools/search', { params });
    return response.data;
  },
};
