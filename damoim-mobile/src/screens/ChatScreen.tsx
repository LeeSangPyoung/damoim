import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { chatAPI, ChatRoomResponse, ChatMessageResponse } from '../api/chat';
import { groupChatAPI, GroupChatRoomResponse, GroupChatMessageResponse } from '../api/groupChat';
import { friendAPI, FriendResponse } from '../api/friend';
import { userAPI } from '../api/user';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import NoticeBanner from '../components/NoticeBanner';
import HeaderActions from '../components/HeaderActions';
import { WS_BASE_URL, HEADER_TOP_PADDING } from '../constants/config';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Client } from '@stomp/stompjs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabType = 'dm' | 'group';

type ScreenView =
  | { kind: 'list' }
  | { kind: 'dm-chat'; room: ChatRoomResponse }
  | { kind: 'group-chat'; room: GroupChatRoomResponse };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMOJI_LIST = [
  '😀','😂','🤣','😍','🥰','😘','😊','😎','🤔','😢',
  '😭','😡','🥺','👍','👎','👏','🙏','❤️','🔥','💯',
  '🎉','✨','💪','🤝','👋','😱','🤗','😴','🤮','💕',
  '🙄','😏','🥳','😈','💀','🤡','👀','💬','📸','🎵',
];

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h < 12 ? '오전' : '오후';
    const hour12 = h % 12 || 12;
    return `${ampm} ${hour12}:${m}`;
  }

  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<TabType>('dm');
  const [view, setView] = useState<ScreenView>({ kind: 'list' });

  // ---- DM state ----
  const [dmRooms, setDmRooms] = useState<ChatRoomResponse[]>([]);
  const [dmMessages, setDmMessages] = useState<ChatMessageResponse[]>([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [dmMsgLoading, setDmMsgLoading] = useState(false);

  // ---- Group state ----
  const [groupRooms, setGroupRooms] = useState<GroupChatRoomResponse[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessageResponse[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupMsgLoading, setGroupMsgLoading] = useState(false);

  // ---- Input ----
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  // ---- New chat modal ----
  const [showNewChat, setShowNewChat] = useState(false);
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<FriendResponse[]>([]);
  const [groupName, setGroupName] = useState('');

  // ---- User school info cache ----
  const [userSchools, setUserSchools] = useState<Record<string, string>>({});

  // ---- WebSocket ----
  const stompClientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<{ id: string; unsubscribe: () => void }[]>([]);

  const flatListRef = useRef<FlatList>(null);

  const userId = user?.userId ?? '';

  // =========================================================================
  // Data fetching
  // =========================================================================

  const fetchDmRooms = useCallback(async () => {
    if (!userId) return;
    setDmLoading(true);
    try {
      const rooms = await chatAPI.getMyChatRooms(userId);
      setDmRooms(rooms);
      // 학교 정보 로드
      const schoolMap: Record<string, string> = {};
      await Promise.all(rooms.map(async (r) => {
        try {
          const profile = await userAPI.getProfile(r.otherUser.userId);
          if (profile.schools?.length > 0) {
            const s = profile.schools[0];
            const shortName = s.schoolName.replace(/(초등학교|중학교|고등학교|대학교)/, (m: string) => {
              if (m === '초등학교') return '초';
              if (m === '중학교') return '중';
              if (m === '고등학교') return '고';
              return '대';
            });
            const cls = s.grade && s.classNumber ? ` ${s.grade}-${s.classNumber}반` : '';
            schoolMap[r.otherUser.userId] = `${shortName}${cls}`;
          }
        } catch {}
      }));
      setUserSchools(prev => ({ ...prev, ...schoolMap }));
    } catch (e) {
      console.warn('[ChatScreen] fetchDmRooms error', e);
    } finally {
      setDmLoading(false);
    }
  }, [userId]);

  const fetchGroupRooms = useCallback(async () => {
    if (!userId) return;
    setGroupLoading(true);
    try {
      const rooms = await groupChatAPI.getMyRooms(userId);
      setGroupRooms(rooms);
    } catch (e) {
      console.warn('[ChatScreen] fetchGroupRooms error', e);
    } finally {
      setGroupLoading(false);
    }
  }, [userId]);

  const fetchDmMessages = useCallback(
    async (roomId: number) => {
      if (!userId) return;
      setDmMsgLoading(true);
      try {
        const msgs = await chatAPI.getMessages(roomId, userId);
        setDmMessages(msgs);
      } catch (e) {
        console.warn('[ChatScreen] fetchDmMessages error', e);
      } finally {
        setDmMsgLoading(false);
      }
    },
    [userId],
  );

  const fetchGroupMessages = useCallback(
    async (roomId: number) => {
      if (!userId) return;
      setGroupMsgLoading(true);
      try {
        const msgs = await groupChatAPI.getMessages(roomId, userId);
        setGroupMessages(msgs);
      } catch (e) {
        console.warn('[ChatScreen] fetchGroupMessages error', e);
      } finally {
        setGroupMsgLoading(false);
      }
    },
    [userId],
  );

  // =========================================================================
  // Initial load
  // =========================================================================

  useEffect(() => {
    if (tab === 'dm') {
      fetchDmRooms();
    } else {
      fetchGroupRooms();
    }
  }, [tab, fetchDmRooms, fetchGroupRooms]);

  // 채팅 목록 화면에서 5초마다 자동 새로고침 (unreadCount 반영)
  useEffect(() => {
    if (view.kind !== 'list') return;
    const interval = setInterval(() => {
      if (tab === 'dm') fetchDmRooms();
      else fetchGroupRooms();
    }, 5000);
    return () => clearInterval(interval);
  }, [view.kind, tab, fetchDmRooms, fetchGroupRooms]);

  // 외부에서 openRoomId 파라미터로 진입 시 해당 DM 채팅방 자동 열기
  useEffect(() => {
    const openRoomId = route.params?.openRoomId as number | undefined;
    if (!openRoomId || !userId) return;
    navigation.setParams({ openRoomId: undefined });
    setTab('dm');
    (async () => {
      let rooms = dmRooms;
      if (rooms.length === 0) {
        rooms = await chatAPI.getMyChatRooms(userId);
        setDmRooms(rooms);
      }
      const room = rooms.find(r => r.id === openRoomId);
      if (room) openDmRoom(room);
    })();
  }, [route.params?.openRoomId]);

  // =========================================================================
  // WebSocket (STOMP over native WebSocket)
  // =========================================================================

  const [stompConnected, setStompConnected] = useState(false);

  const connectStomp = useCallback(() => {
    if (!userId || !token) return;

    // Build native WebSocket URL (not SockJS)
    const wsUrl = WS_BASE_URL.replace(/^http/, 'ws') + '/websocket';

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      forceBinaryWSFrames: false,
      appendMissingNULLonIncoming: true,
      webSocketFactory: () => new WebSocket(wsUrl),
      onConnect: () => {
        console.log('[ChatScreen] STOMP connected');
        setStompConnected(true);
      },
      onStompError: (frame) => {
        console.warn('[ChatScreen] STOMP error', frame.headers?.message);
      },
      onDisconnect: () => {
        console.log('[ChatScreen] STOMP disconnected');
        setStompConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;
  }, [userId, token]);

  useEffect(() => {
    connectStomp();
    return () => {
      subscriptionsRef.current.forEach((s) => {
        try { s.unsubscribe(); } catch {}
      });
      subscriptionsRef.current = [];
      if (stompClientRef.current?.active) {
        stompClientRef.current.deactivate();
      }
    };
  }, [connectStomp]);

  // Subscribe / unsubscribe when entering / leaving a chat room
  useEffect(() => {
    const client = stompClientRef.current;
    if (!client?.connected) return;

    // Unsubscribe previous
    subscriptionsRef.current.forEach((s) => {
      try { s.unsubscribe(); } catch {}
    });
    subscriptionsRef.current = [];

    if (view.kind === 'dm-chat') {
      const roomId = view.room.id;
      console.log('[ChatScreen] Subscribing to /topic/chat/' + roomId);
      const sub = client.subscribe(`/topic/chat/${roomId}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log('[ChatScreen] WS DM received:', data.type || 'MESSAGE', data.id);
          if (data.type === 'READ') {
            // Mark messages as read
            setDmMessages((prev) =>
              prev.map((m) => (m.senderUserId === userId ? { ...m, isRead: true } : m)),
            );
          } else {
            // New message
            const msg: ChatMessageResponse = data;
            setDmMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // 상대방이 보낸 메시지면 즉시 읽음 처리 (내가 이 채팅방을 보고 있으므로)
            if (msg.senderUserId !== userId) {
              chatAPI.markRoomAsRead(roomId, userId).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[ChatScreen] WS DM parse error', e);
        }
      });
      subscriptionsRef.current.push(sub);
    } else if (view.kind === 'group-chat') {
      const roomId = view.room.id;
      console.log('[ChatScreen] Subscribing to /topic/group-chat/' + roomId);
      const sub = client.subscribe(`/topic/group-chat/${roomId}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          if (data.type === 'READ') {
            setGroupMessages((prev) =>
              prev.map((m) => ({ ...m, unreadCount: Math.max(0, m.unreadCount - 1) })),
            );
          } else {
            const msg: GroupChatMessageResponse = data;
            setGroupMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        } catch (e) {
          console.warn('[ChatScreen] WS Group parse error', e);
        }
      });
      subscriptionsRef.current.push(sub);
    }
  }, [view, userId, stompConnected]);

  // =========================================================================
  // Send message
  // =========================================================================

  const handleSendDm = async (roomId: number) => {
    const text = messageText.trim();
    if (!text || !userId) return;
    setSending(true);
    setMessageText('');
    try {
      const msg = await chatAPI.sendMessage(roomId, userId, text);
      // WS에서 이미 추가된 경우 중복 방지
      setDmMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (e) {
      Alert.alert('전송 실패', '메시지를 보내지 못했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleSendGroup = async (roomId: number) => {
    const text = messageText.trim();
    if (!text || !userId) return;
    setSending(true);
    setMessageText('');
    try {
      const msg = await groupChatAPI.sendMessage(roomId, userId, text);
      // WS에서 이미 추가된 경우 중복 방지
      setGroupMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (e) {
      Alert.alert('전송 실패', '메시지를 보내지 못했습니다.');
    } finally {
      setSending(false);
    }
  };

  // =========================================================================
  // Navigation helpers
  // =========================================================================

  const openDmRoom = (room: ChatRoomResponse) => {
    setView({ kind: 'dm-chat', room });
    fetchDmMessages(room.id);
  };

  const openGroupRoom = (room: GroupChatRoomResponse) => {
    setView({ kind: 'group-chat', room });
    fetchGroupMessages(room.id);
  };

  const goBack = () => {
    setView({ kind: 'list' });
    setDmMessages([]);
    setGroupMessages([]);
    setMessageText('');
    // Refresh room lists
    if (tab === 'dm') fetchDmRooms();
    else fetchGroupRooms();
  };

  // =========================================================================
  // Delete helpers
  // =========================================================================

  const handleDeleteDmRoom = (room: ChatRoomResponse) => {
    const doDelete = async () => {
      try {
        await chatAPI.leaveRoom(room.id, userId);
        setDmRooms(prev => prev.filter(r => r.id !== room.id));
        if (view.kind === 'dm-chat') goBack();
      } catch {
        Alert.alert('오류', '채팅방 나가기에 실패했습니다.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${room.otherUser.name}님과의 채팅방을 나가시겠습니까?`)) doDelete();
    } else {
      Alert.alert('채팅방 나가기', `${room.otherUser.name}님과의 채팅방을 나가시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleDeleteGroupRoom = (room: GroupChatRoomResponse) => {
    const doDelete = async () => {
      try {
        await groupChatAPI.leaveRoom(room.id, userId);
        setGroupRooms(prev => prev.filter(r => r.id !== room.id));
        if (view.kind === 'group-chat') goBack();
      } catch {
        Alert.alert('오류', '그룹 채팅방 나가기에 실패했습니다.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`"${room.name}" 그룹 채팅방을 나가시겠습니까?`)) doDelete();
    } else {
      Alert.alert('채팅방 나가기', `"${room.name}" 그룹 채팅방을 나가시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '나가기', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // =========================================================================
  // New chat helpers
  // =========================================================================

  const openNewChat = async () => {
    setShowNewChat(true);
    setSelectedFriends([]);
    setGroupName('');
    if (!userId) return;
    setFriendsLoading(true);
    try {
      const res = await friendAPI.getMyFriends(userId);
      setFriends(res);
    } catch {} finally {
      setFriendsLoading(false);
    }
  };

  const toggleFriend = (f: FriendResponse) => {
    setSelectedFriends(prev =>
      prev.find(x => x.userId === f.userId)
        ? prev.filter(x => x.userId !== f.userId)
        : [...prev, f],
    );
  };

  const handleCreateChat = async () => {
    if (!userId || selectedFriends.length === 0) return;

    if (tab === 'dm') {
      // 1:1 채팅: 첫 번째 선택된 친구와 채팅방 생성
      try {
        const { roomId } = await chatAPI.createOrGetRoom(userId, selectedFriends[0].userId);
        setShowNewChat(false);
        await fetchDmRooms();
        const room = dmRooms.find(r => r.id === roomId);
        if (room) openDmRoom(room);
        else {
          // rooms가 아직 갱신 안 되었을 수 있으므로 다시 fetch
          const rooms = await chatAPI.getMyChatRooms(userId);
          setDmRooms(rooms);
          const found = rooms.find(r => r.id === roomId);
          if (found) openDmRoom(found);
        }
      } catch (e: any) {
        Alert.alert('오류', e?.response?.data?.error || '채팅방 생성 실패');
      }
    } else {
      // 그룹 채팅
      const name = groupName.trim() || selectedFriends.map(f => f.name).join(', ');
      try {
        const room = await groupChatAPI.createRoom(userId, name, selectedFriends.map(f => f.userId));
        setShowNewChat(false);
        await fetchGroupRooms();
        openGroupRoom(room);
      } catch (e: any) {
        Alert.alert('오류', e?.response?.data?.error || '그룹 채팅방 생성 실패');
      }
    }
  };

  // =========================================================================
  // Render: Tab bar
  // =========================================================================

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, tab === 'dm' && styles.tabActive]}
        onPress={() => { setTab('dm'); setView({ kind: 'list' }); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, tab === 'dm' && styles.tabTextActive]}>1:1 채팅</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, tab === 'group' && styles.tabActive]}
        onPress={() => { setTab('group'); setView({ kind: 'list' }); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, tab === 'group' && styles.tabTextActive]}>그룹 채팅</Text>
      </TouchableOpacity>
    </View>
  );

  // =========================================================================
  // Render: DM room list
  // =========================================================================

  const renderDmRoomItem = ({ item }: { item: ChatRoomResponse }) => (
    <TouchableOpacity style={styles.roomRow} onPress={() => openDmRoom(item)} activeOpacity={0.6}>
      <Avatar uri={item.otherUser.profileImageUrl} name={item.otherUser.name} size={50} />
      <View style={styles.roomInfo}>
        <Text style={styles.roomName} numberOfLines={1}>{item.otherUser.name}</Text>
        {userSchools[item.otherUser.userId] && (
          <Text style={styles.roomSchool} numberOfLines={1}>✎ {userSchools[item.otherUser.userId]}</Text>
        )}
        <Text style={styles.roomLastMsg} numberOfLines={1}>
          {item.lastMessage ?? ''}
        </Text>
      </View>
      <View style={styles.roomMeta}>
        <Text style={styles.roomTime}>{formatTime(item.lastMessageAt)}</Text>
        {item.unreadCount > 0 && <Badge count={item.unreadCount} />}
      </View>
    </TouchableOpacity>
  );

  const renderNewChatButton = (label: string) => (
    <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 }}>
      <TouchableOpacity style={styles.newChatInlineBtn} onPress={openNewChat} activeOpacity={0.7}>
        <Text style={styles.newChatInlineBtnText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDmList = () => {
    if (dmLoading) {
      return <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />;
    }
    if (dmRooms.length === 0) {
      return (
        <View>
          {renderNewChatButton('+ 새 1:1 채팅')}
          <EmptyState icon="💬" title="채팅방이 없습니다" subtitle="친구에게 먼저 메시지를 보내보세요" />
        </View>
      );
    }
    return (
      <FlatList
        data={dmRooms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderDmRoomItem}
        ListHeaderComponent={renderNewChatButton('+ 새 1:1 채팅')}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  // =========================================================================
  // Render: Group room list
  // =========================================================================

  const renderGroupRoomItem = ({ item }: { item: GroupChatRoomResponse }) => (
    <TouchableOpacity style={styles.roomRow} onPress={() => openGroupRoom(item)} activeOpacity={0.6}>
      <View style={styles.groupAvatar}>
        <Text style={styles.groupAvatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <View style={styles.groupNameRow}>
            <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{item.memberCount}</Text>
            </View>
          </View>
          <Text style={styles.roomTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={styles.roomLastMsg} numberOfLines={1}>
          {item.lastMessage ?? ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderGroupList = () => {
    if (groupLoading) {
      return <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />;
    }
    if (groupRooms.length === 0) {
      return (
        <View>
          {renderNewChatButton('+ 새 그룹 채팅')}
          <EmptyState icon="👥" title="그룹 채팅방이 없습니다" subtitle="그룹을 만들어 대화를 시작하세요" />
        </View>
      );
    }
    return (
      <FlatList
        data={groupRooms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGroupRoomItem}
        ListHeaderComponent={renderNewChatButton('+ 새 그룹 채팅')}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  // =========================================================================
  // Render: DM messages
  // =========================================================================

  const renderDmMessageItem = ({ item }: { item: ChatMessageResponse }) => {
    const isMine = item.senderUserId === userId;
    if (item.completelyDeleted) {
      return (
        <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
          <View style={[styles.msgBubble, styles.msgDeleted]}>
            <Text style={styles.msgDeletedText}>삭제된 메시지입니다</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMine && (
          <Avatar
            uri={view.kind === 'dm-chat' ? view.room.otherUser.profileImageUrl : undefined}
            name={item.senderName}
            size={32}
          />
        )}
        <View style={isMine ? styles.msgRight : styles.msgLeft}>
          {!isMine && <Text style={styles.msgSenderName}>{item.senderName}</Text>}
          <View style={styles.msgBubbleRow}>
            {isMine && (
              <View style={styles.msgMeta}>
                {!item.isRead && <Text style={styles.readReceipt}>1</Text>}
                <Text style={styles.msgTime}>{formatTime(item.sentAt)}</Text>
              </View>
            )}
            <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
              <Text style={[styles.msgText, isMine && styles.msgTextMine]}>
                {item.deletedBySender ? '삭제된 메시지입니다' : item.content}
              </Text>
            </View>
            {!isMine && (
              <View style={styles.msgMeta}>
                <Text style={styles.msgTime}>{formatTime(item.sentAt)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderDmChat = (room: ChatRoomResponse) => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Avatar uri={room.otherUser.profileImageUrl} name={room.otherUser.name} size={32} />
        <Text style={[styles.chatHeaderTitle, { flex: 1 }]}>{room.otherUser.name}</Text>
        <TouchableOpacity onPress={() => handleDeleteDmRoom(room)} style={styles.leaveRoomBtn}>
          <Text style={styles.leaveRoomBtnText}>나가기</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {dmMsgLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={[...dmMessages].reverse()}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDmMessageItem}
          inverted
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Emoji Panel */}
      {showEmoji && (
        <ScrollView style={styles.emojiPanel} contentContainerStyle={styles.emojiPanelContent}>
          {EMOJI_LIST.map((em, i) => (
            <TouchableOpacity key={i} style={styles.emojiItem} onPress={() => setMessageText(prev => prev + em)}>
              <Text style={styles.emojiText}>{em}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={() => setShowEmoji(v => !v)} style={styles.emojiBtn} activeOpacity={0.7}>
          <Ionicons name={showEmoji ? 'close-circle' : 'happy-outline'} size={24} color={showEmoji ? Colors.gray400 : Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={Colors.gray400}
          value={messageText}
          onChangeText={setMessageText}
          onFocus={() => setShowEmoji(false)}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => handleSendDm(room.id)}
          disabled={!messageText.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.sendBtnText}>전송</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // =========================================================================
  // Render: Group messages
  // =========================================================================

  const renderGroupMessageItem = ({ item }: { item: GroupChatMessageResponse }) => {
    const isMine = item.senderUserId === userId;

    if (item.messageType === 'SYSTEM') {
      return (
        <View style={styles.systemMsgRow}>
          <Text style={styles.systemMsgText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMine && (
          <Avatar name={item.senderName} size={32} />
        )}
        <View style={isMine ? styles.msgRight : styles.msgLeft}>
          {!isMine && <Text style={styles.msgSenderName}>{item.senderName}</Text>}
          <View style={styles.msgBubbleRow}>
            {isMine && (
              <View style={styles.msgMeta}>
                {item.unreadCount > 0 && (
                  <Text style={styles.readReceipt}>{item.unreadCount}</Text>
                )}
                <Text style={styles.msgTime}>{formatTime(item.sentAt)}</Text>
              </View>
            )}
            <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
              <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.content}</Text>
            </View>
            {!isMine && (
              <View style={styles.msgMeta}>
                {item.unreadCount > 0 && (
                  <Text style={styles.readReceipt}>{item.unreadCount}</Text>
                )}
                <Text style={styles.msgTime}>{formatTime(item.sentAt)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderGroupChat = (room: GroupChatRoomResponse) => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.chatHeaderTitle, { flex: 1 }]}>{room.name}</Text>
        <View style={styles.memberBadge}>
          <Text style={styles.memberBadgeText}>{room.memberCount}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteGroupRoom(room)} style={styles.leaveRoomBtn}>
          <Text style={styles.leaveRoomBtnText}>나가기</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {groupMsgLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.primary} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={[...groupMessages].reverse()}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroupMessageItem}
          inverted
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Emoji Panel */}
      {showEmoji && (
        <ScrollView style={styles.emojiPanel} contentContainerStyle={styles.emojiPanelContent}>
          {EMOJI_LIST.map((em, i) => (
            <TouchableOpacity key={i} style={styles.emojiItem} onPress={() => setMessageText(prev => prev + em)}>
              <Text style={styles.emojiText}>{em}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={() => setShowEmoji(v => !v)} style={styles.emojiBtn} activeOpacity={0.7}>
          <Ionicons name={showEmoji ? 'close-circle' : 'happy-outline'} size={24} color={showEmoji ? Colors.gray400 : Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={Colors.gray400}
          value={messageText}
          onChangeText={setMessageText}
          onFocus={() => setShowEmoji(false)}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => handleSendGroup(room.id)}
          disabled={!messageText.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.sendBtnText}>전송</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // =========================================================================
  // Render: Main
  // =========================================================================

  if (view.kind === 'dm-chat') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderDmChat(view.room)}
      </SafeAreaView>
    );
  }

  if (view.kind === 'group-chat') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderGroupChat(view.room)}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>채팅</Text>
        <HeaderActions navigation={navigation} />
      </View>
      <NoticeBanner />
      {renderTabs()}
      <View style={styles.flex}>
        {tab === 'dm' ? renderDmList() : renderGroupList()}
      </View>

      {/* New Chat Modal */}
      <Modal visible={showNewChat} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {tab === 'dm' ? '새 1:1 채팅' : '새 그룹 채팅'}
              </Text>
              <TouchableOpacity onPress={() => setShowNewChat(false)}>
                <Ionicons name="close" size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            {tab === 'group' && (
              <TextInput
                style={styles.groupNameInput}
                placeholder="그룹 이름 (선택)"
                value={groupName}
                onChangeText={setGroupName}
                placeholderTextColor={Colors.gray400}
              />
            )}

            <Text style={styles.modalSubtitle}>
              친구를 선택하세요 {tab === 'dm' ? '(1명)' : `(${selectedFriends.length}명 선택됨)`}
            </Text>

            {friendsLoading ? (
              <ActivityIndicator style={{ marginTop: 20 }} size="large" color={Colors.primary} />
            ) : friends.length === 0 ? (
              <Text style={styles.modalEmpty}>친구가 없습니다</Text>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={item => item.userId}
                style={styles.friendList}
                renderItem={({ item }) => {
                  const selected = !!selectedFriends.find(f => f.userId === item.userId);
                  return (
                    <TouchableOpacity
                      style={[styles.friendRow, selected && styles.friendRowSelected]}
                      onPress={() => {
                        if (tab === 'dm') {
                          setSelectedFriends([item]);
                        } else {
                          toggleFriend(item);
                        }
                      }}
                      activeOpacity={0.6}
                    >
                      <Avatar uri={item.profileImageUrl} name={item.name} size={40} />
                      <Text style={styles.friendName}>{item.name}</Text>
                      {selected && (
                        <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.createChatBtn, selectedFriends.length === 0 && styles.createChatBtnDisabled]}
              onPress={handleCreateChat}
              disabled={selectedFriends.length === 0}
            >
              <Text style={styles.createChatBtnText}>
                {tab === 'dm' ? '채팅 시작' : '그룹 만들기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },

  // Screen header
  screenHeader: {
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
  newChatBtn: {
    padding: 4,
  },
  newChatInlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFF8E7',
    borderWidth: 1.5,
    borderColor: '#F0E0B0',
  },
  newChatInlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5D4037',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  leaveRoomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  leaveRoomBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
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
    borderBottomWidth: 2,
    borderBottomColor: '#F0E0B0',
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -2,
  },
  tabActive: {
    borderBottomColor: '#2D5016',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#C4A96A',
  },
  tabTextActive: {
    color: '#2D5016',
    fontWeight: '700',
  },

  // Room list
  listContent: {
    paddingBottom: 20,
    paddingTop: 2,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0E0B0',
    shadowColor: '#8B6914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  roomInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3E2723',
    flex: 1,
    marginRight: 8,
  },
  roomTime: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '500',
  },
  roomSchool: {
    fontSize: 12,
    color: '#2D5016',
    opacity: 0.7,
    marginTop: 1,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomLastMsg: {
    fontSize: 14,
    color: '#8D6E63',
    marginTop: 3,
  },
  roomMeta: {
    alignItems: 'flex-end',
    marginLeft: 8,
    gap: 5,
    flexShrink: 0,
  },

  // Group avatar placeholder
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  memberBadge: {
    backgroundColor: Colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray600,
  },

  // Chat header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2D5016',
    borderBottomWidth: 3,
    borderBottomColor: '#C49A2A',
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFE156',
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    fontFamily: Fonts.bold,
  },

  // Messages
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  msgLeft: {
    marginLeft: 8,
    maxWidth: '75%',
  },
  msgRight: {
    maxWidth: '75%',
    alignItems: 'flex-end',
  },
  msgSenderName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  msgBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  msgBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '100%',
  },
  msgBubbleMine: {
    backgroundColor: '#2D5016',
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0E0B0',
  },
  msgText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
  msgTextMine: {
    color: Colors.white,
  },
  msgMeta: {
    marginHorizontal: 4,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  readReceipt: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 1,
  },
  msgTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  msgDeleted: {
    backgroundColor: Colors.gray100,
  },
  msgDeletedText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // System message
  systemMsgRow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsgText: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: Colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#F0E0B0',
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#2D5016',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray300,
  },
  sendBtnText: {
    color: '#FFE156',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },

  // Loader
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // New chat modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalEmpty: {
    fontSize: 14,
    color: Colors.gray400,
    textAlign: 'center',
    paddingVertical: 30,
  },
  groupNameInput: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.gray50,
  },
  friendList: {
    maxHeight: 350,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  friendRowSelected: {
    backgroundColor: Colors.primaryLight || '#e8f0fe',
  },
  friendName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  createChatBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createChatBtnDisabled: {
    opacity: 0.4,
  },
  createChatBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  emojiBtn: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPanel: {
    backgroundColor: '#FFF3D0',
    borderTopWidth: 1,
    borderTopColor: '#E8C84A',
    maxHeight: 100,
  },
  emojiPanelContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  emojiItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
