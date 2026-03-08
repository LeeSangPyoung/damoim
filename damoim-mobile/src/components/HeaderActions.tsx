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
        <Ionicons name="notifications-outline" size={22} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => rootNav.navigate('Messages')}
        activeOpacity={0.7}
      >
        <Ionicons name="mail-outline" size={22} color={Colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => rootNav.navigate('Profile')}
        activeOpacity={0.7}
      >
        <Ionicons name="person-circle-outline" size={22} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
