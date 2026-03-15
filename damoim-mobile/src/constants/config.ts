import { Platform } from 'react-native';

// 서버 주소 설정
const NGROK_URL = 'https://ce56-118-220-67-122.ngrok-free.app';

const getBaseUrl = () => {
  if (Platform.OS === 'web') return 'http://localhost:8080';
  return NGROK_URL;
};

const BASE = getBaseUrl();

export const API_BASE_URL = `${BASE}/api`;
export const WS_BASE_URL = `${BASE}/ws`;

// 상단 safe area 여백 (상태바 높이)
export const HEADER_TOP_PADDING = Platform.OS === 'web' ? 16 : 56;
