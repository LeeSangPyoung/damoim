import { Platform } from 'react-native';

// 서버 주소 설정
// - web: localhost
// - android 에뮬레이터: 10.0.2.2
// - 실제 기기(APK): PC의 실제 IP 또는 ngrok 주소로 변경
const getHost = () => {
  if (Platform.OS === 'web') return 'localhost';
  // 실제 기기 테스트 시 아래 주소를 ngrok 또는 서버 주소로 변경
  return '192.168.45.75';
};

const HOST = getHost();

export const API_BASE_URL = `http://${HOST}:8080/api`;
export const WS_BASE_URL = `http://${HOST}:8080/ws`;

// 상단 safe area 여백 (상태바 높이)
export const HEADER_TOP_PADDING = Platform.OS === 'web' ? 16 : 56;
