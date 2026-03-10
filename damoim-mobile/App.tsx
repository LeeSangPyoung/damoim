import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';
import {
  useFonts,
  Gaegu_300Light,
  Gaegu_400Regular,
  Gaegu_700Bold,
} from '@expo-google-fonts/gaegu';

export default function App() {
  const [fontsLoaded] = useFonts({
    Gaegu_300Light,
    Gaegu_400Regular,
    Gaegu_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E7' }}>
        <ActivityIndicator size="large" color="#3B6B24" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
        <Toast />
      </AuthProvider>
    </View>
  );
}
