import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { notificationAPI, NotificationResponse } from '../api/notification';
import EmptyState from '../components/EmptyState';
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

const typeIcon: Record<string, string> = {
  MESSAGE: '✉️', FRIEND_REQUEST: '👋', FRIEND_ACCEPTED: '🤝', COMMENT: '💬', LIKE: '❤️',
  CHAT: '💬', GROUP_CHAT: '👥', POST: '📝', NEW_SHOP: '🏪',
  REUNION_INVITE: '📨', MEETING_CREATED: '📅', MEETING_CONFIRMED: '✅', MEETING_CANCELLED: '❌',
  FEE_CREATED: '💰', FEE_UPDATED: '💳',
  REUNION_JOIN_REQUEST: '🙋', REUNION_JOIN_APPROVED: '✅', REUNION_JOIN_REJECTED: '❌',
  REUNION_POST: '📝', REUNION_TREASURER_ASSIGNED: '👑',
};

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
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
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
        ListEmptyComponent={<EmptyState icon="🔔" title="알림이 없습니다" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.notifRow, !item.read && styles.notifUnread]} onPress={() => handleMarkRead(item)}>
            <Text style={styles.notifIcon}>{typeIcon[item.type] || '🔔'}</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  markAllRead: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  deleteAll: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100, gap: 10 },
  notifUnread: { backgroundColor: Colors.primaryLight },
  notifIcon: { fontSize: 20 },
  notifContent: { fontSize: 14, color: Colors.text, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
});
