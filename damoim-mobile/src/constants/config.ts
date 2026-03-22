import { Platform } from 'react-native';

// 서버 주소 설정
const getBaseUrl = () => {
  if (Platform.OS === 'web') return 'http://43.203.233.215:8080';
  return 'http://43.203.233.215:8080';
};

const BASE = getBaseUrl();

export const API_BASE_URL = `${BASE}/api`;
export const WS_BASE_URL = `${BASE}/ws`;

// 상단 safe area 여백 (상태바 높이)
export const HEADER_TOP_PADDING = Platform.OS === 'web' ? 16 : 56;
