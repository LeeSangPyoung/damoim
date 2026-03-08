import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
        <Toast />
      </AuthProvider>
    </View>
  );
}
