import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role?: string;
}

export const saveAuthData = async (token: string, user: AuthUser) => {
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

export const getAuthData = async (): Promise<{ token: string | null; user: AuthUser | null }> => {
  const token = await AsyncStorage.getItem('token');
  const userStr = await AsyncStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  return { token, user };
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('token');
};

export const getUser = async (): Promise<AuthUser | null> => {
  const userStr = await AsyncStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const clearAuthData = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem('token');
  return !!token;
};
