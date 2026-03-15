import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { messageAPI, MessageResponse } from '../api/message';
import { ClassmateInfo } from '../api/user';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import HeaderActions from '../components/HeaderActions';

type Tab = 'received' | 'sent';

function formatTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function MessagesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const [receivedMessages, setReceivedMessages] = useState<MessageResponse[]>([]);
  const [sentMessages, setSentMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Compose modal state
  const [composeVisible, setComposeVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<ClassmateInfo | null>(null);
  const [composeContent, setComposeContent] = useState('');
  const [sending, setSending] = useState(false);
  const [fromExternal, setFromExternal] = useState(false);

  const tabIndicator = useRef(new Animated.Value(0)).current;

  const messages = activeTab === 'received' ? receivedMessages : sentMessages;

  // ── Data fetching ──────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      const [received, sent] = await Promise.all([
        messageAPI.getReceivedMessages(user.userId),
        messageAPI.getSentMessages(user.userId),
      ]);
      setReceivedMessages(received);
      setSentMessages(sent);
    } catch {
      Alert.alert('오류', '쪽지를 불러오는 데 실패했습니다.');
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchMessages();
      setLoading(false);
    })();
  }, [fetchMessages]);

  // 외부에서 composeToId 파라미터로 진입 시 자동으로 쪽지 작성 모달 열기
  useEffect(() => {
    const composeToId = route.params?.composeToId as string | undefined;
    const composeToName = route.params?.composeToName as string | undefined;
    if (composeToId && composeToName) {
      setSelectedUser({
        id: 0,
        userId: composeToId,
        name: composeToName,
        school: { schoolType: '', schoolName: '', graduationYear: '' },
      } as ClassmateInfo);
      setComposeContent('');
      setSearchQuery(composeToName);
      setFromExternal(true);
      setComposeVisible(true);
      // 파라미터 초기화 (뒤로 갔다 다시 왔을 때 중복 방지)
      navigation.setParams({ composeToId: undefined, composeToName: undefined });
    }
  }, [route.params?.composeToId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  // ── Tab switching ──────────────────────────────────────────────

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setExpandedId(null);
    Animated.spring(tabIndicator, {
      toValue: tab === 'received' ? 0 : 1,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  // ── Actions ────────────────────────────────────────────────────

  const handleExpand = async (msg: MessageResponse) => {
    const isExpanding = expandedId !== msg.id;
    setExpandedId(isExpanding ? msg.id : null);

    if (isExpanding && activeTab === 'received' && !msg.read && user) {
      try {
        await messageAPI.markAsRead(msg.id, user.userId);
        setReceivedMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read: true, readAt: new Date().toISOString() } : m)),
        );
      } catch {}
    }
  };

  const handleDelete = (msg: MessageResponse) => {
    const doDelete = async () => {
      if (!user) return;
      try {
        await messageAPI.deleteMessage(msg.id, user.userId);
        if (activeTab === 'received') {
          setReceivedMessages((prev) => prev.filter((m) => m.id !== msg.id));
        } else {
          setSentMessages((prev) => prev.filter((m) => m.id !== msg.id));
        }
      } catch {
        Alert.alert('오류', '쪽지 삭제에 실패했습니다.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('이 쪽지를 삭제하시겠습니까?')) doDelete();
    } else {
      Alert.alert('쪽지 삭제', '이 쪽지를 삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const unread = receivedMessages.filter((m) => !m.read);
    if (unread.length === 0) {
      Alert.alert('알림', '읽지 않은 쪽지가 없습니다.');
      return;
    }
    try {
      await messageAPI.markAllAsRead(user.userId);
      setReceivedMessages((prev) =>
        prev.map((m) => ({ ...m, read: true, readAt: m.readAt || new Date().toISOString() })),
      );
    } catch {
      Alert.alert('오류', '모두 읽음 처리에 실패했습니다.');
    }
  };

  const handleLongPress = (msg: MessageResponse) => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [];

    if (activeTab === 'received' && !msg.read) {
      options.push({
        text: '읽음 처리',
        onPress: async () => {
          if (!user) return;
          try {
            await messageAPI.markAsRead(msg.id, user.userId);
            setReceivedMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? { ...m, read: true, readAt: new Date().toISOString() } : m)),
            );
          } catch {}
        },
      });
    }

    options.push({
      text: '삭제',
      style: 'destructive',
      onPress: () => handleDelete(msg),
    });

    options.push({ text: '취소', style: 'cancel' });

    Alert.alert('쪽지 옵션', undefined, options);
  };

  const handleDeleteAll = () => {
    if (!user) return;
    const count = messages.length;
    if (count === 0) {
      Alert.alert('알림', '삭제할 쪽지가 없습니다.');
      return;
    }
    const label = activeTab === 'received' ? '받은' : '보낸';
    if (Platform.OS === 'web') {
      if (!window.confirm(`${label} 쪽지 ${count}건을 모두 삭제하시겠습니까?`)) return;
      (async () => {
        try {
          if (activeTab === 'received') {
            await messageAPI.deleteAllReceived(user.userId);
            setReceivedMessages([]);
          } else {
            await messageAPI.deleteAllSent(user.userId);
            setSentMessages([]);
          }
        } catch {
          Alert.alert('오류', '모두 삭제에 실패했습니다.');
        }
      })();
    } else {
      Alert.alert('모두 삭제', `${label} 쪽지 ${count}건을 모두 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeTab === 'received') {
                await messageAPI.deleteAllReceived(user.userId);
                setReceivedMessages([]);
              } else {
                await messageAPI.deleteAllSent(user.userId);
                setSentMessages([]);
              }
            } catch {
              Alert.alert('오류', '모두 삭제에 실패했습니다.');
            }
          },
        },
      ]);
    }
  };

  // ── Compose ────────────────────────────────────────────────────

  const closeCompose = () => {
    setComposeVisible(false);
    Keyboard.dismiss();
  };

  const handleSend = async () => {
    if (!user || !selectedUser) return;
    const trimmed = composeContent.trim();
    if (!trimmed) {
      Alert.alert('알림', '내용을 입력해 주세요.');
      return;
    }

    setSending(true);
    try {
      await messageAPI.sendMessage(user.userId, selectedUser.userId, trimmed);
      closeCompose();
      if (fromExternal) {
        setFromExternal(false);
        navigation.goBack();
      } else {
        Alert.alert('전송 완료', '쪽지가 전송되었습니다.');
        await fetchMessages();
      }
    } catch {
      Alert.alert('오류', '쪽지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────

  const unreadCount = receivedMessages.filter((m) => !m.read).length;
  const screenWidth = Dimensions.get('window').width;
  const indicatorLeft = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth / 2],
  });

  const renderMessageItem = ({ item }: { item: MessageResponse }) => {
    const isReceived = activeTab === 'received';
    const person = isReceived ? item.sender : item.receiver;
    const isExpanded = expandedId === item.id;
    const isUnread = isReceived && !item.read;

    return (
      <TouchableOpacity
        style={[styles.messageCard, isUnread && styles.messageCardUnread]}
        onPress={() => handleExpand(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.messageRow}>
          <Avatar uri={person.profileImageUrl} name={person.name} size={44} />
          <View style={styles.messageBody}>
            <View style={styles.messageHeader}>
              <View style={styles.nameRow}>
                <Text style={[styles.messageName, isUnread && styles.messageNameUnread]}>
                  {person.name}
                </Text>
                {isUnread && <View style={styles.unreadDot} />}
                {!isReceived && (
                  <View style={[styles.readBadge, item.read ? styles.readBadgeRead : styles.readBadgeUnread]}>
                    <Text style={[styles.readBadgeText, item.read ? styles.readBadgeTextRead : styles.readBadgeTextUnread]}>
                      {item.read ? '확인' : '미확인'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.messageTime}>{formatTime(item.sentAt)}</Text>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
            </View>
            <Text
              style={[styles.messagePreview, isUnread && styles.messagePreviewUnread]}
              numberOfLines={isExpanded ? undefined : 1}
            >
              {item.content}
            </Text>
            {isExpanded && (
              <View style={styles.expandedActions}>
                <Text style={styles.readStatus}>
                  {isReceived
                    ? item.readAt
                      ? `읽은 시간: ${formatTime(item.readAt)}`
                      : ''
                    : item.read
                      ? '읽음'
                      : '안읽음'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isReceived && (
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => {
                        setSelectedUser({
                          id: 0,
                          userId: item.sender.userId,
                          name: item.sender.name,
                          school: { schoolType: '', schoolName: '', graduationYear: '' },
                        } as ClassmateInfo);
                        setSearchQuery(item.sender.name);
                        setComposeContent('');
                        setFromExternal(false);
                        setComposeVisible(true);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.replyBtnText}>회신</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteBtnText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading state ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>쪽지 불러오는 중...</Text>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFE156" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>쪽지</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {activeTab === 'received' && unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllAsRead}>
              <Text style={styles.markAllBtnText}>모두 읽음</Text>
            </TouchableOpacity>
          )}
          {messages.length > 0 && (
            <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
              <Text style={styles.deleteAllBtnText}>모두 삭제</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => switchTab('received')}>
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            받은 쪽지
            {unreadCount > 0 && (
              <Text style={styles.badge}>{` ${unreadCount}`}</Text>
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => switchTab('sent')}>
          <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
            보낸 쪽지
          </Text>
        </TouchableOpacity>
        <Animated.View style={[styles.tabIndicator, { left: indicatorLeft, width: screenWidth / 2 }]} />
      </View>

      {/* Message list */}
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessageItem}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            ionIcon={activeTab === 'received' ? 'mail-open-outline' : 'paper-plane-outline'}
            title={activeTab === 'received' ? '받은 쪽지가 없습니다' : '보낸 쪽지가 없습니다'}
            subtitle="쪽지를 보내 동창들과 소통해 보세요"
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D5016']} tintColor={'#2D5016'} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Compose Modal */}
      <Modal visible={composeVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeCompose}>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior="padding"
        >
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeCompose}>
              <Text style={styles.modalCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>새 쪽지</Text>
            <TouchableOpacity onPress={handleSend} disabled={sending || !selectedUser || !composeContent.trim()}>
              <Text
                style={[
                  styles.modalSend,
                  (!selectedUser || !composeContent.trim() || sending) && styles.modalSendDisabled,
                ]}
              >
                {sending ? '전송중...' : '보내기'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.composeBody}>
            {/* 받는 사람 카드 */}
            <View style={styles.composeCard}>
              <Text style={styles.composeCardLabel}>받는 사람</Text>
              {selectedUser && (
                <View style={styles.recipientDisplay}>
                  <Avatar uri={selectedUser.profileImageUrl} name={selectedUser.name} size={36} />
                  <Text style={styles.recipientName}>{selectedUser.name}</Text>
                </View>
              )}
            </View>

            {/* 내용 카드 */}
            <View style={styles.composeCard}>
              <Text style={styles.composeCardLabel}>내용</Text>
              <TextInput
                style={styles.contentInput}
                placeholder="쪽지 내용을 입력하세요..."
                placeholderTextColor={Colors.gray400}
                value={composeContent}
                onChangeText={setComposeContent}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{composeContent.length}/1000</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.gray500,
    fontFamily: Fonts.regular,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
    backgroundColor: '#2D5016',
    borderBottomWidth: 3,
    borderBottomColor: '#C49A2A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Fonts.chalk,
    letterSpacing: 2,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,225,86,0.2)',
  },
  markAllBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFE156',
  },
  deleteAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
  },
  deleteAllBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E0B0',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray400,
    fontFamily: Fonts.bold,
  },
  tabTextActive: {
    color: '#2D5016',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#2D5016',
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.red,
  },

  // List
  listContent: {
    paddingVertical: 8,
  },
  emptyList: {
    flexGrow: 1,
  },

  // Message card
  messageCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0E0B0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  messageCardUnread: {
    backgroundColor: '#FFF8E7',
    borderLeftWidth: 3,
    borderLeftColor: '#2D5016',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageBody: {
    flex: 1,
    marginLeft: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#5D4037',
    fontFamily: Fonts.bold,
  },
  messageNameUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2D5016',
    marginLeft: 6,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messagePreview: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
  messagePreviewUnread: {
    color: Colors.text,
  },
  expandedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  readStatus: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  replyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF3D0',
  },
  replyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C49A2A',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.redLight,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.red,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 36 : 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D5016',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.white,
    fontWeight: '300',
    marginTop: -1,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.goldBorder,
    backgroundColor: Colors.backgroundDeep,
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.gray500,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  modalSend: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D5016',
    fontFamily: Fonts.bold,
  },
  modalSendDisabled: {
    color: Colors.gray300,
  },

  // Compose body
  composeBody: {
    flex: 1,
    padding: 16,
  },
  composeCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    padding: 16,
    marginBottom: 12,
  },
  composeCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  receiverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  receiverLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
    fontFamily: Fonts.bold,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 4,
    minWidth: 120,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
  },
  selectedChipRemove: {
    fontSize: 14,
    color: Colors.gray400,
    fontWeight: '700',
    marginLeft: 2,
  },

  // Search dropdown
  searchDropdown: {
    backgroundColor: Colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.goldBorder,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  searchResultInfo: {
    marginLeft: 10,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  searchResultSchool: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  searchingText: {
    fontSize: 13,
    color: Colors.gray400,
  },

  // Content section
  contentInput: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    minHeight: 150,
    maxHeight: 300,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  recipientDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  readBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  readBadgeRead: {
    backgroundColor: Colors.greenLight,
  },
  readBadgeUnread: {
    backgroundColor: Colors.redLight,
  },
  readBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  readBadgeTextRead: {
    color: Colors.green,
  },
  readBadgeTextUnread: {
    color: Colors.red,
  },
});
