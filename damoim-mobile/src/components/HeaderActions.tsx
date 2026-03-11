import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { notificationAPI } from '../api/notification';
import { messageAPI } from '../api/message';

export default function HeaderActions({ navigation }: { navigation?: any }) {
  const fallbackNav = useNavigation();
  const nav = navigation || fallbackNav;
  const { user } = useAuth();
  const [hasNewNotif, setHasNewNotif] = useState(false);
  const [hasNewMsg, setHasNewMsg] = useState(false);
  const prevNotif = useRef(false);
  const prevMsg = useRef(false);

  const check = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const [notifCount, msgCount] = await Promise.all([
        notificationAPI.getUnreadCount(user.userId),
        messageAPI.getUnreadCount(user.userId),
      ]);
      const newNotif = notifCount > 0;
      const newMsg = msgCount > 0;
      // 값이 바뀔 때만 setState (불필요한 리렌더 방지)
      if (prevNotif.current !== newNotif) { prevNotif.current = newNotif; setHasNewNotif(newNotif); }
      if (prevMsg.current !== newMsg) { prevMsg.current = newMsg; setHasNewMsg(newMsg); }
    } catch {}
  }, [user?.userId]);

  // 화면 포커스 시 즉시 체크
  useFocusEffect(useCallback(() => { check(); }, [check]));

  // 5초 간격 폴링
  useEffect(() => {
    if (!user?.userId) return;
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [user?.userId, check]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => nav.navigate('Notifications')}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={18} color={'rgba(255,255,255,0.8)'} />
        {hasNewNotif && <View style={styles.badge}><Text style={styles.badgeText}>N</Text></View>}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => nav.navigate('Messages')}
        activeOpacity={0.7}
      >
        <Ionicons name="mail-outline" size={18} color={'rgba(255,255,255,0.8)'} />
        {hasNewMsg && <View style={styles.badge}><Text style={styles.badgeText}>N</Text></View>}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => nav.navigate('Profile')}
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#2D5016',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
