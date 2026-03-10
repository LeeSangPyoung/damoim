import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { notificationAPI, NotificationResponse } from '../api/notification';
import HeaderActions from '../components/HeaderActions';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const typeIconMap: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  MESSAGE: { name: 'mail-outline', color: '#2D5016' },
  FRIEND_REQUEST: { name: 'person-add-outline', color: '#8b5cf6' },
  FRIEND_ACCEPTED: { name: 'people-outline', color: '#22c55e' },
  COMMENT: { name: 'chatbox-outline', color: '#6366f1' },
  LIKE: { name: 'heart-outline', color: '#FF6B6B' },
  CHAT: { name: 'chatbox-outline', color: '#2D5016' },
  GROUP_CHAT: { name: 'people-outline', color: '#6366f1' },
  POST: { name: 'document-text-outline', color: '#8B6914' },
  NEW_SHOP: { name: 'storefront-outline', color: '#5D8A3C' },
  REUNION_INVITE: { name: 'mail-open-outline', color: '#8b5cf6' },
  MEETING_CREATED: { name: 'calendar-outline', color: '#2D5016' },
  MEETING_CONFIRMED: { name: 'checkmark-circle-outline', color: '#22c55e' },
  MEETING_CANCELLED: { name: 'close-circle-outline', color: '#FF6B6B' },
  FEE_CREATED: { name: 'cash-outline', color: '#8B6914' },
  FEE_UPDATED: { name: 'card-outline', color: '#6366f1' },
  REUNION_JOIN_REQUEST: { name: 'hand-left-outline', color: '#8b5cf6' },
  REUNION_JOIN_APPROVED: { name: 'checkmark-circle-outline', color: '#22c55e' },
  REUNION_JOIN_REJECTED: { name: 'close-circle-outline', color: '#FF6B6B' },
  REUNION_POST: { name: 'document-text-outline', color: '#8B6914' },
  REUNION_TREASURER_ASSIGNED: { name: 'ribbon-outline', color: '#8B6914' },
};
const defaultIcon = { name: 'notifications-outline' as keyof typeof Ionicons.glyphMap, color: Colors.gray500 };

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (user) loadNotifications(); }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationAPI.getNotifications(user.userId);
      setNotifications(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await notificationAPI.markAllAsRead(user.userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleDeleteAll = () => {
    if (!user) return;
    const doDelete = async () => {
      try {
        await notificationAPI.deleteAll(user.userId);
        setNotifications([]);
      } catch {}
    };
    if (Platform.OS === 'web') {
      if (window.confirm('모든 알림을 삭제하시겠습니까?')) doDelete();
    } else {
      Alert.alert('알림 삭제', '모든 알림을 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleMarkRead = async (notif: NotificationResponse) => {
    if (!user || notif.read) return;
    try {
      await notificationAPI.markAsRead(notif.id, user.userId);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFE156" />
          </TouchableOpacity>
          <Text style={styles.title}>알림</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleMarkAllRead}><Text style={styles.markAllRead}>모두 읽음</Text></TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteAll}><Text style={styles.deleteAll}>모두 삭제</Text></TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>알림이 없습니다</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.notifRow, !item.read && styles.notifUnread]} onPress={() => handleMarkRead(item)}>
            <View style={styles.notifIconWrap}>
              <Ionicons
                name={(typeIconMap[item.type] || defaultIcon).name}
                size={20}
                color={(typeIconMap[item.type] || defaultIcon).color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifContent}>{item.content}</Text>
              <Text style={styles.notifTime}>{item.senderName} · {timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, backgroundColor: '#2D5016', borderBottomWidth: 3, borderBottomColor: '#C49A2A' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold, letterSpacing: 2 },
  markAllRead: { fontSize: 13, color: '#FFE156', fontWeight: '600' },
  deleteAll: { fontSize: 13, color: '#FFE156', fontWeight: '600' },
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#F0E0B0', gap: 10 },
  notifUnread: { backgroundColor: '#FFF8E7' },
  notifIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
  notifContent: { fontSize: 14, color: '#5D4037', lineHeight: 18, fontFamily: Fonts.regular },
  notifTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2D5016' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray500, marginTop: 12, fontFamily: Fonts.regular },
});
