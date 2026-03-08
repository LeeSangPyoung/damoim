import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host localhost
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${HOST}:8080/api`;
export const WS_BASE_URL = `http://${HOST}:8080/ws`;

// 상단 safe area 여백 (상태바 높이)
export const HEADER_TOP_PADDING = Platform.OS === 'web' ? 16 : 56;
