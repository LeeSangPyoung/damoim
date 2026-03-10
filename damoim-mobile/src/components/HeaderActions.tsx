import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';

// 루트 네비게이터를 찾아서 navigate (어떤 탭에서든 동작)
function getRootNavigation(navigation: any) {
  let nav = navigation;
  while (nav.getParent?.()) {
    nav = nav.getParent();
  }
  return nav;
}

export default function HeaderActions({ navigation }: { navigation?: any }) {
  const fallbackNav = useNavigation();
  const nav = navigation || fallbackNav;
  const rootNav = getRootNavigation(nav);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => rootNav.navigate('Notifications')}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={18} color={'rgba(255,255,255,0.8)'} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => rootNav.navigate('Messages')}
        activeOpacity={0.7}
      >
        <Ionicons name="mail-outline" size={18} color={'rgba(255,255,255,0.8)'} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => rootNav.navigate('Profile')}
        activeOpacity={0.7}
      >
        <Ionicons name="person-outline" size={18} color={'rgba(255,255,255,0.8)'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
