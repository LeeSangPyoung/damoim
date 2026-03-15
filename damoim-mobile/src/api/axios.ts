import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 15000,
});

// 요청 인터셉터: JWT 토큰 자동 추가
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: localhost URL을 현재 서버 URL로 치환
const SERVER_BASE = API_BASE_URL.replace('/api', '');
function replaceLocalhostUrls(data: any): any {
  if (typeof data === 'string') {
    return data.replace(/http:\/\/localhost:8080/g, SERVER_BASE);
  }
  if (Array.isArray(data)) {
    return data.map(replaceLocalhostUrls);
  }
  if (data && typeof data === 'object') {
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = replaceLocalhostUrls(data[key]);
    }
    return result;
  }
  return data;
}

apiClient.interceptors.response.use(
  (response) => {
    response.data = replaceLocalhostUrls(response.data);
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Navigation will be handled by AuthContext
    }
    return Promise.reject(error);
  }
);

export default apiClient;
