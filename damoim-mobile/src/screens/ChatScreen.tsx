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
  Image,
  Linking,
  AppState,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import LinkedText from '../components/LinkedText';
import GroupAvatar from '../components/GroupAvatar';
import NoticeBanner from '../components/NoticeBanner';
import HeaderActions from '../components/HeaderActions';
import { API_BASE_URL, WS_BASE_URL, HEADER_TOP_PADDING } from '../constants/config';
import { notificationAPI } from '../api/notification';
import { useBadge } from '../navigation/AppNavigator';
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

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

// 리액션을 그룹별로 묶기
function groupReactions(reactions?: { emoji: string; userId: string; userName: string }[]) {
  if (!reactions || reactions.length === 0) return [];
  const map = new Map<string, { emoji: string; count: number; users: string[] }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(r.userId);
    } else {
      map.set(r.emoji, { emoji: r.emoji, count: 1, users: [r.userId] });
    }
  }
  return Array.from(map.values());
}

// 이모지만으로 구성된 메시지인지 판별 (1~3개)
function isEmojiOnly(text: string): boolean {
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}){1,3}$/u;
  return emojiRegex.test(text.trim());
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

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
  return `${month}월 ${day}일`;
}

// ---------------------------------------------------------------------------
// Typing Dots Animation (카카오톡 스타일)
// ---------------------------------------------------------------------------
const TypingDots = React.memo(() => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(450 - delay),
        ]),
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B7355',
    marginHorizontal: 2,
    transform: [{ translateY: anim }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, token } = useAuth();
  const badge = useBadge();
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
  const messageTextRef = useRef('');
  const [hasText, setHasText] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

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
  const appStateRef = useRef(AppState.currentState);

  const flatListRef = useRef<FlatList>(null);

  // ---- Typing indicator ----
  const [otherTyping, setOtherTyping] = useState(false);
  const [groupTypingUsers, setGroupTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const userId = user?.userId ?? '';

  // =========================================================================
  // Data fetching
  // =========================================================================

  const fetchDmRooms = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setDmLoading(true);
    try {
      const rooms = await chatAPI.getMyChatRooms(userId);
      setDmRooms(rooms);
      // 학교 정보 로드 (최초만)
      if (!silent) {
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
      }
    } catch (e) {
      console.warn('[ChatScreen] fetchDmRooms error', e);
    } finally {
      if (!silent) setDmLoading(false);
    }
  }, [userId]);

  const fetchGroupRooms = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setGroupLoading(true);
    try {
      const rooms = await groupChatAPI.getMyRooms(userId);
      setGroupRooms(rooms.filter(r => !r.name.startsWith('[찐모임]')));
    } catch (e) {
      console.warn('[ChatScreen] fetchGroupRooms error', e);
    } finally {
      if (!silent) setGroupLoading(false);
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

  // 초기 로드: DM + 그룹 둘 다 (탭 N뱃지용)
  useEffect(() => {
    fetchDmRooms();
    fetchGroupRooms();
  }, [fetchDmRooms, fetchGroupRooms]);

  // 채팅 목록 화면에서 2초마다 자동 새로고침 (둘 다 — 탭 N뱃지 반영)
  useEffect(() => {
    if (view.kind !== 'list') return;
    const interval = setInterval(() => {
      fetchDmRooms(true);
      fetchGroupRooms(true);
    }, 2000);
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

    // 기존 연결 정리
    if (stompClientRef.current?.active) {
      try { stompClientRef.current.deactivate(); } catch {}
    }

    const wsUrl = WS_BASE_URL.replace(/^http/, 'ws') + '/websocket';

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
      forceBinaryWSFrames: false,
      appendMissingNULLonIncoming: true,
      webSocketFactory: () => new WebSocket(wsUrl),
      onConnect: () => {
        console.log('[ChatScreen] STOMP connected');
        setStompConnected(true);
      },
      onStompError: (frame) => {
        console.warn('[ChatScreen] STOMP error', frame.headers?.message);
        setStompConnected(false);
      },
      onDisconnect: () => {
        console.log('[ChatScreen] STOMP disconnected');
        setStompConnected(false);
      },
      onWebSocketClose: () => {
        console.log('[ChatScreen] WebSocket closed');
        setStompConnected(false);
      },
      onWebSocketError: (evt) => {
        console.warn('[ChatScreen] WebSocket error', evt);
        setStompConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;
  }, [userId, token]);

  // WebSocket 연결 관리
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

  // AppState: 앱이 백그라운드→포그라운드로 돌아오면 즉시 재연결 + 메시지 새로고침
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev.match(/inactive|background/) && nextState === 'active') {
        console.log('[ChatScreen] App resumed → reconnecting & refreshing');
        // WebSocket 재연결
        if (!stompClientRef.current?.connected) {
          connectStomp();
        }
        // 즉시 메시지 새로고침
        if (view.kind === 'dm-chat') {
          chatAPI.getMessages(view.room.id, userId).then(msgs => setDmMessages(msgs)).catch(() => {});
        } else if (view.kind === 'group-chat') {
          groupChatAPI.getMessages(view.room.id, userId).then(msgs => setGroupMessages(msgs)).catch(() => {});
        } else {
          if (tab === 'dm') fetchDmRooms(true);
          else fetchGroupRooms(true);
        }
      }
    });
    return () => subscription.remove();
  }, [view, userId, tab, connectStomp, fetchDmRooms, fetchGroupRooms]);

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
          if (data.type === 'TYPING') {
            // 상대방 타이핑 인디케이터
            if (data.userId !== userId) {
              if (data.typing) {
                setOtherTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 6000);
              } else {
                setOtherTyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              }
            }
            return;
          }
          if (data.type === 'READ') {
            // Mark messages as read
            setDmMessages((prev) =>
              prev.map((m) => (m.senderUserId === userId ? { ...m, isRead: true } : m)),
            );
          } else {
            // New message — 임시 메시지(음수 ID)가 있으면 교체, 아니면 추가
            const msg: ChatMessageResponse = data;
            // 채팅방 보고 있으므로 모든 메시지 isRead: true로 표시
            const displayMsg = { ...msg, isRead: true };
            setDmMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              const tempIdx = prev.findIndex((m) => m.id < 0 && m.content === msg.content && m.senderUserId === msg.senderUserId);
              if (tempIdx >= 0) {
                const next = [...prev];
                next[tempIdx] = displayMsg;
                return next;
              }
              return [...prev, displayMsg];
            });
            // 상대방이 보낸 메시지면 즉시 읽음 처리 + 알림도 읽음 + 하단 N뱃지 재확인
            if (msg.senderUserId !== userId) {
              chatAPI.markRoomAsRead(roomId, userId).then(() => {
                badge.recheckChatUnread();
              }).catch(() => {});
              notificationAPI.markAsReadByReference(userId, 'CHAT', roomId).catch(() => {});
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
          if (data.type === 'TYPING') {
            if (data.userId !== userId) {
              if (data.typing) {
                setGroupTypingUsers((prev) => {
                  if (prev.find(u => u.userId === data.userId)) return prev;
                  return [...prev, { userId: data.userId, userName: data.userName }];
                });
                // 6초 후 자동 제거
                setTimeout(() => {
                  setGroupTypingUsers((prev) => prev.filter(u => u.userId !== data.userId));
                }, 6000);
              } else {
                setGroupTypingUsers((prev) => prev.filter(u => u.userId !== data.userId));
              }
            }
            return;
          }
          if (data.type === 'READ') {
            // READ 이벤트 → 서버에서 정확한 카운트 가져옴
            groupChatAPI.getMessages(roomId, userId, false).then(msgs => setGroupMessages(msgs)).catch(() => {});
          } else {
            // 새 메시지: 채팅방에 있으므로 내가 읽은 만큼 -1 (내 메시지든 상대 메시지든)
            const msg: GroupChatMessageResponse = data;
            const displayMsg = { ...msg, unreadCount: Math.max(0, msg.unreadCount - 1) };
            setGroupMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              const tempIdx = prev.findIndex((m) => m.id < 0 && m.content === msg.content && m.senderUserId === msg.senderUserId);
              if (tempIdx >= 0) {
                const next = [...prev];
                next[tempIdx] = displayMsg;
                return next;
              }
              return [...prev, displayMsg];
            });
            // 상대방 메시지면 읽음 처리 후 서버에서 정확한 카운트 가져옴
            if (msg.senderUserId !== userId) {
              groupChatAPI.getMessages(roomId, userId, true).then(msgs => {
                setGroupMessages(msgs);
                badge.recheckChatUnread();
              }).catch(() => {});
              notificationAPI.markAsReadByReference(userId, 'GROUP_CHAT', roomId).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[ChatScreen] WS Group parse error', e);
        }
      });
      subscriptionsRef.current.push(sub);
    }
  }, [view, userId, stompConnected]);

  // 타이핑 keep-alive: 텍스트가 있으면 3초마다 typing=true 재전송
  useEffect(() => {
    if (view.kind !== 'dm-chat' && view.kind !== 'group-chat') return;
    const interval = setInterval(() => {
      if (messageTextRef.current.trim().length > 0) {
        if (view.kind === 'dm-chat') {
          chatAPI.sendTyping(view.room.id, userId, true).catch(() => {});
        } else {
          groupChatAPI.sendTyping(view.room.id, userId, true).catch(() => {});
        }
        lastTypingSentRef.current = Date.now();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [view, userId]);

  // 폴링 fallback: WS 연결 시 느린 주기, 끊겼을 때 빠른 주기
  // 폴링은 읽음 처리 없이(markRead=false) 메시지만 가져옴
  useEffect(() => {
    const pollingInterval = stompConnected ? 8000 : 1500;
    if (view.kind === 'dm-chat') {
      // 채팅방 진입 시 즉시 1회 fetch (읽음 처리 포함)
      chatAPI.getMessages(view.room.id, userId, true).then(msgs => {
        setDmMessages(msgs);
      }).catch(() => {});

      const interval = setInterval(async () => {
        try {
          const msgs = await chatAPI.getMessages(view.room.id, userId, false);
          setDmMessages(prev => {
            // 임시 메시지(음수 ID)를 제외한 실제 메시지끼리만 비교
            const realPrev = prev.filter(m => m.id > 0);
            if (msgs.length === realPrev.length) {
              const lastNew = msgs[msgs.length - 1];
              const lastOld = realPrev[realPrev.length - 1];
              if (lastNew?.id === lastOld?.id) return prev; // 변경 없음 → 리렌더 안 함
            }
            // 변경 있음 → 임시 메시지 유지하면서 병합
            const tempMsgs = prev.filter(m => m.id < 0);
            return [...msgs, ...tempMsgs];
          });
          // WS 안 될 때 타이핑 상태도 폴링
          if (!stompConnected) {
            const typingRes = await chatAPI.getTypingStatus(view.room.id, userId);
            setOtherTyping(typingRes.typingUsers.length > 0);
          }
        } catch {}
      }, pollingInterval);
      return () => clearInterval(interval);
    }
    if (view.kind === 'group-chat') {
      groupChatAPI.getMessages(view.room.id, userId, true).then(msgs => {
        setGroupMessages(msgs);
      }).catch(() => {});

      const interval = setInterval(async () => {
        try {
          const msgs = await groupChatAPI.getMessages(view.room.id, userId, false);
          setGroupMessages(prev => {
            const realPrev = prev.filter(m => m.id > 0);
            if (msgs.length === realPrev.length) {
              const lastNew = msgs[msgs.length - 1];
              const lastOld = realPrev[realPrev.length - 1];
              if (lastNew?.id === lastOld?.id) return prev;
            }
            const tempMsgs = prev.filter(m => m.id < 0);
            return [...msgs, ...tempMsgs];
          });
        } catch {}
      }, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [view, userId, stompConnected]);

  // =========================================================================
  // Send message
  // =========================================================================

  const handleSendDm = async (roomId: number) => {
    const text = messageTextRef.current.trim();
    if (!text || !userId) return;
    messageTextRef.current = '';
    setHasText(false);
    if (inputRef.current) inputRef.current.clear();
    AsyncStorage.removeItem(`chat_draft_dm-chat_${roomId}`).catch(() => {});
    // 낙관적 UI: 즉시 화면에 표시
    const tempId = -(Date.now());
    const optimistic: ChatMessageResponse = {
      id: tempId,
      chatRoomId: roomId,
      senderUserId: userId,
      senderName: user?.name ?? '',
      content: text,
      messageType: 'TEXT',
      isRead: true,  // 낙관적: 읽음으로 표시 (상대방이 안 읽으면 폴링에서 보정)
      sentAt: new Date().toISOString(),
    };
    setDmMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const msg = await chatAPI.sendMessage(roomId, userId, text);
      // 임시 메시지를 실제 메시지로 교체 (isRead는 낙관적으로 true 유지)
      const msgWithRead = { ...msg, isRead: true };
      setDmMessages((prev) => prev.map((m) => m.id === tempId ? msgWithRead : m).filter((m, i, arr) => {
        if (m.id === msgWithRead.id) return arr.findIndex((x) => x.id === msgWithRead.id) === i;
        return true;
      }));
    } catch (e) {
      // 실패 시 임시 메시지 제거
      setDmMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('전송 실패', '메시지를 보내지 못했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleSendGroup = async (roomId: number) => {
    const text = messageTextRef.current.trim();
    if (!text || !userId) return;
    messageTextRef.current = '';
    setHasText(false);
    if (inputRef.current) inputRef.current.clear();
    AsyncStorage.removeItem(`chat_draft_group-chat_${roomId}`).catch(() => {});
    // 낙관적 UI: 즉시 화면에 표시
    const tempId = -(Date.now());
    const optimistic: GroupChatMessageResponse = {
      id: tempId,
      roomId: roomId,
      senderUserId: userId,
      senderName: user?.name ?? '',
      content: text,
      messageType: 'TEXT',
      unreadCount: 0,
      sentAt: new Date().toISOString(),
    };
    setGroupMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const msg = await groupChatAPI.sendMessage(roomId, userId, text);
      const msgFixed = { ...msg, unreadCount: 0 };
      setGroupMessages((prev) => prev.map((m) => m.id === tempId ? msgFixed : m).filter((m, i, arr) => {
        if (m.id === msgFixed.id) return arr.findIndex((x) => x.id === msgFixed.id) === i;
        return true;
      }));
    } catch (e) {
      setGroupMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('전송 실패', '메시지를 보내지 못했습니다.');
    } finally {
      setSending(false);
    }
  };

  // =========================================================================
  // Attachment: pick & send
  // =========================================================================

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const pickAndSendImage = (roomId: number, isGroup: boolean) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        sendAttachmentWeb(roomId, isGroup, file);
      };
      input.click();
    } else {
      (async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        await sendAttachmentNative(roomId, isGroup, asset.uri, asset.fileName || undefined);
      })();
    }
  };

  const pickAndSendFile = (roomId: number, isGroup: boolean) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        sendAttachmentWeb(roomId, isGroup, file);
      };
      input.click();
    } else {
      (async () => {
        try {
          const DocumentPicker = require('expo-document-picker');
          const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
          if (result.canceled || !result.assets?.[0]) return;
          const asset = result.assets[0];
          await sendAttachmentNative(roomId, isGroup, asset.uri, asset.name);
        } catch {
          Alert.alert('안내', '파일 선택을 사용하려면 expo-document-picker가 필요합니다.');
        }
      })();
    }
  };

  // 웹: File 객체를 직접 FormData에 넣어 업로드
  const sendAttachmentWeb = async (roomId: number, isGroup: boolean, file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '업로드 실패');
      }
      const uploaded = await res.json();
      const attachment = {
        messageType: uploaded.messageType as string,
        attachmentUrl: uploaded.url as string,
        fileName: uploaded.fileName as string,
        fileSize: uploaded.fileSize as number,
      };
      const content = uploaded.messageType === 'IMAGE' ? '사진' : uploaded.fileName;
      if (isGroup) {
        const msg = await groupChatAPI.sendMessage(roomId, userId, content, attachment);
        setGroupMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else {
        const msg = await chatAPI.sendMessage(roomId, userId, content, attachment);
        setDmMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch (e: any) {
      console.error('Upload error:', e);
      if (Platform.OS === 'web') {
        window.alert('업로드 실패: ' + (e?.message || '파일 전송에 실패했습니다.'));
      } else {
        Alert.alert('업로드 실패', e?.message || '파일 전송에 실패했습니다.');
      }
    } finally {
      setUploading(false);
    }
  };

  // 네이티브: URI 기반 업로드
  const sendAttachmentNative = async (roomId: number, isGroup: boolean, uri: string, fileName?: string) => {
    if (!userId) return;
    setUploading(true);
    try {
      const uploaded = await chatAPI.uploadFile(uri, fileName);
      const attachment = {
        messageType: uploaded.messageType,
        attachmentUrl: uploaded.url,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
      };
      const content = uploaded.messageType === 'IMAGE' ? '사진' : uploaded.fileName;
      const msg = await chatAPI.sendMessage(roomId, userId, content, attachment);
      setDmMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (e: any) {
      Alert.alert('업로드 실패', e?.message || '파일 전송에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // 리액션
  const [reactionMsgId, setReactionMsgId] = useState<number | null>(null);
  const [reactionSource, setReactionSource] = useState<'DM' | 'GROUP'>('DM');

  const handleReaction = async (messageId: number, source: 'DM' | 'GROUP', emoji: string) => {
    if (!userId) return;
    setReactionMsgId(null);
    try {
      await chatAPI.toggleReaction(userId, messageId, source, emoji);
      // 리액션 후 메시지 새로고침
      if (source === 'DM' && view.kind === 'dm-chat') {
        const msgs = await chatAPI.getMessages(view.room.id, userId);
        setDmMessages(msgs);
      } else if (source === 'GROUP' && view.kind === 'group-chat') {
        const msgs = await groupChatAPI.getMessages(view.room.id, userId);
        setGroupMessages(msgs);
      }
    } catch (e) {
      console.error('Reaction error:', e);
    }
  };

  // =========================================================================
  // Navigation helpers
  // =========================================================================

  const openDmRoom = async (room: ChatRoomResponse) => {
    setView({ kind: 'dm-chat', room });
    fetchDmMessages(room.id);
    if (userId) notificationAPI.markAsReadByReference(userId, 'CHAT', room.id).catch(() => {});
    setTimeout(() => badge.recheckChatUnread(), 500);
    // 드래프트 복원
    try {
      const draft = await AsyncStorage.getItem(`chat_draft_dm-chat_${room.id}`);
      if (draft) {
        messageTextRef.current = draft;
        setHasText(true);
        setTimeout(() => {
          if (inputRef.current) inputRef.current.setNativeProps({ text: draft });
        }, 300);
        // 드래프트가 있으면 타이핑 알림도 보냄
        chatAPI.sendTyping(room.id, userId, true).catch(() => {});
      }
    } catch {}
  };

  const openGroupRoom = async (room: GroupChatRoomResponse) => {
    setView({ kind: 'group-chat', room });
    fetchGroupMessages(room.id);
    if (userId) notificationAPI.markAsReadByReference(userId, 'GROUP_CHAT', room.id).catch(() => {});
    setTimeout(() => badge.recheckChatUnread(), 500);
    // 드래프트 복원
    try {
      const draft = await AsyncStorage.getItem(`chat_draft_group-chat_${room.id}`);
      if (draft) {
        messageTextRef.current = draft;
        setHasText(true);
        setTimeout(() => {
          if (inputRef.current) inputRef.current.setNativeProps({ text: draft });
        }, 300);
        groupChatAPI.sendTyping(room.id, userId, true).catch(() => {});
      }
    } catch {}
  };

  const goBack = () => {
    // 입력 중인 텍스트 임시저장 (드래프트)
    if (view.kind === 'dm-chat' || view.kind === 'group-chat') {
      const roomId = view.room.id;
      const draftKey = `chat_draft_${view.kind}_${roomId}`;
      const text = messageTextRef.current.trim();
      if (text) {
        AsyncStorage.setItem(draftKey, text).catch(() => {});
      } else {
        AsyncStorage.removeItem(draftKey).catch(() => {});
      }
      // typing=false 안 보냄 → 서버 타임아웃(5초)까지 자연 만료
    }
    setView({ kind: 'list' });
    setDmMessages([]);
    setGroupMessages([]);
    setGroupTypingUsers([]);
    setOtherTyping(false);
    messageTextRef.current = '';
    setHasText(false);
    if (inputRef.current) inputRef.current.clear();
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

  const dmHasUnread = dmRooms.some(r => r.unreadCount > 0);
  const groupHasUnread = groupRooms.some(r => r.unreadCount > 0);

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, tab === 'dm' && styles.tabActive]}
        onPress={() => { setTab('dm'); setView({ kind: 'list' }); }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.tabText, tab === 'dm' && styles.tabTextActive]}>1:1 채팅</Text>
          {dmHasUnread && <Badge count={'N'} size={16} />}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, tab === 'group' && styles.tabActive]}
        onPress={() => { setTab('group'); setView({ kind: 'list' }); }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.tabText, tab === 'group' && styles.tabTextActive]}>그룹 채팅</Text>
          {groupHasUnread && <Badge count={'N'} size={16} />}
        </View>
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
        {item.unreadCount > 0 && <Badge count={'N'} />}
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
          <EmptyState ionIcon="chatbubble-outline" title="채팅방이 없습니다" subtitle="친구에게 먼저 메시지를 보내보세요" />
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
      <GroupAvatar members={item.members || []} size={48} />
      <View style={styles.roomInfo}>
        <View style={styles.roomHeader}>
          <View style={styles.groupNameRow}>
            <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{item.memberCount}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.roomTime}>{formatTime(item.lastMessageAt)}</Text>
            {item.unreadCount > 0 && <Badge count={'N'} />}
          </View>
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
          <EmptyState ionIcon="people-outline" title="그룹 채팅방이 없습니다" subtitle="그룹을 만들어 대화를 시작하세요" />
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
    const grouped = groupReactions(item.reactions);
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMine && (
          <Avatar
            uri={view.kind === 'dm-chat' ? view.room.otherUser.profileImageUrl : undefined}
            name={item.senderName}
            size={45}
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
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={() => { setReactionMsgId(item.id); setReactionSource('DM'); }}
              onPress={item.messageType === 'IMAGE' && item.attachmentUrl ? () => setImagePreview(item.attachmentUrl!) : undefined}
            >
              {item.deletedBySender ? (
                <View style={[styles.msgBubble, styles.msgDeleted]}>
                  <Text style={styles.msgDeletedText}>삭제된 메시지입니다</Text>
                </View>
              ) : item.messageType === 'IMAGE' && item.attachmentUrl ? (
                <Image source={{ uri: item.attachmentUrl }} style={styles.chatImage} resizeMode="cover" />
              ) : item.messageType === 'FILE' && item.attachmentUrl ? (
                <TouchableOpacity
                  style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther, styles.fileBubble]}
                  onPress={() => Linking.openURL(item.attachmentUrl!)}
                  onLongPress={() => { setReactionMsgId(item.id); setReactionSource('DM'); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-attach-outline" size={24} color={isMine ? '#fff' : Colors.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.fileNameText, isMine && { color: '#fff' }]} numberOfLines={1}>{item.fileName || '파일'}</Text>
                    {item.fileSize != null && <Text style={[styles.fileSizeText, isMine && { color: 'rgba(255,255,255,0.7)' }]}>{formatFileSize(item.fileSize)}</Text>}
                  </View>
                  <Ionicons name="download-outline" size={20} color={isMine ? 'rgba(255,255,255,0.7)' : Colors.gray400} />
                </TouchableOpacity>
              ) : isEmojiOnly(item.content) ? (
                <Text style={{ fontSize: 36, lineHeight: 44 }}>{item.content}</Text>
              ) : (
                <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
                  <LinkedText style={[styles.msgText, isMine && styles.msgTextMine]} linkColor={isMine ? '#90caf9' : '#1d4ed8'}>{item.content}</LinkedText>
                </View>
              )}
            </TouchableOpacity>
            {!isMine && (
              <View style={styles.msgMeta}>
                <Text style={styles.msgTime}>{formatTime(item.sentAt)}</Text>
              </View>
            )}
          </View>
          {/* 리액션 표시 */}
          {grouped.length > 0 && (
            <View style={[styles.reactionRow, isMine && { justifyContent: 'flex-end' }]}>
              {grouped.map(g => (
                <TouchableOpacity
                  key={g.emoji}
                  style={[styles.reactionChip, g.users.includes(userId) && styles.reactionChipMine]}
                  onPress={() => handleReaction(item.id, 'DM', g.emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{g.emoji}</Text>
                  {g.count > 1 && <Text style={styles.reactionCount}>{g.count}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDmChat = (room: ChatRoomResponse) => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
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

      {/* Typing indicator */}
      {otherTyping && (
        <View style={styles.typingRow}>
          <Avatar uri={room.otherUser.profileImageUrl} name={room.otherUser.name} size={28} />
          <View style={styles.typingBubble}>
            <TypingDots />
          </View>
        </View>
      )}

      {/* Attach Menu */}
      {showAttachMenu && (
        <View style={styles.attachMenu}>
          <TouchableOpacity
            style={styles.attachMenuItem}
            onPress={() => { setShowAttachMenu(false); pickAndSendImage(room.id, false); }}
            activeOpacity={0.7}
          >
            <View style={[styles.attachIconWrap, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="image" size={22} color="#fff" />
            </View>
            <Text style={styles.attachMenuText}>사진</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachMenuItem}
            onPress={() => { setShowAttachMenu(false); pickAndSendFile(room.id, false); }}
            activeOpacity={0.7}
          >
            <View style={[styles.attachIconWrap, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="document" size={22} color="#fff" />
            </View>
            <Text style={styles.attachMenuText}>파일</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.uploadingText}>파일 전송 중...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          onPress={() => { setShowAttachMenu(v => !v); setShowEmoji(false); }}
          style={styles.emojiBtn}
          activeOpacity={0.7}
        >
          <Ionicons name={showAttachMenu ? 'close-circle' : 'add-circle'} size={26} color={showAttachMenu ? Colors.gray400 : Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowEmoji(v => !v); setShowAttachMenu(false); }} style={styles.emojiBtn} activeOpacity={0.7}>
          <Ionicons name={showEmoji ? 'close-circle' : 'happy-outline'} size={24} color={showEmoji ? Colors.gray400 : Colors.primary} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={Colors.gray400}
          defaultValue=""
          onChangeText={(t) => {
            messageTextRef.current = t;
            setHasText(t.trim().length > 0);
            // 타이핑 인디케이터: 텍스트 있으면 true, 비우면 false
            if (t.trim().length > 0) {
              const now = Date.now();
              if (now - lastTypingSentRef.current > 2000) {
                lastTypingSentRef.current = now;
                chatAPI.sendTyping(room.id, userId, true).catch(() => {});
              }
            } else {
              chatAPI.sendTyping(room.id, userId, false).catch(() => {});
              lastTypingSentRef.current = 0;
            }
          }}
          onFocus={() => { setShowEmoji(false); setShowAttachMenu(false); }}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!hasText || sending) && styles.sendBtnDisabled]}
          onPress={() => {
            handleSendDm(room.id);
            // 전송 시 타이핑 중지 알림
            chatAPI.sendTyping(room.id, userId, false).catch(() => {});
            setOtherTyping(false);
          }}
          disabled={!hasText || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.sendBtnText}>전송</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Emoji Panel - 인풋 아래 */}
      {showEmoji && (
        <View style={styles.emojiPanel}>
          <View style={styles.emojiPanelContent}>
            {EMOJI_LIST.map((em, i) => (
              <TouchableOpacity key={i} style={styles.emojiItem} onPress={() => { messageTextRef.current += em; setHasText(true); if (inputRef.current) inputRef.current.setNativeProps({ text: messageTextRef.current }); }}>
                <Text style={styles.emojiText}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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

    const grouped = groupReactions(item.reactions);
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMine && (
          <Avatar name={item.senderName} size={45} />
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
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={() => { setReactionMsgId(item.id); setReactionSource('GROUP'); }}
              onPress={item.messageType === 'IMAGE' && item.attachmentUrl ? () => setImagePreview(item.attachmentUrl!) : undefined}
            >
              {(item.messageType === 'IMAGE') && item.attachmentUrl ? (
                <Image source={{ uri: item.attachmentUrl }} style={styles.chatImage} resizeMode="cover" />
              ) : (item.messageType === 'FILE') && item.attachmentUrl ? (
                <TouchableOpacity
                  style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther, styles.fileBubble]}
                  onPress={() => Linking.openURL(item.attachmentUrl!)}
                  onLongPress={() => { setReactionMsgId(item.id); setReactionSource('GROUP'); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-attach-outline" size={24} color={isMine ? '#fff' : Colors.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.fileNameText, isMine && { color: '#fff' }]} numberOfLines={1}>{item.fileName || '파일'}</Text>
                    {item.fileSize != null && (
                      <Text style={[styles.fileSizeText, isMine && { color: 'rgba(255,255,255,0.7)' }]}>{formatFileSize(item.fileSize)}</Text>
                    )}
                  </View>
                  <Ionicons name="download-outline" size={20} color={isMine ? 'rgba(255,255,255,0.7)' : Colors.gray400} />
                </TouchableOpacity>
              ) : isEmojiOnly(item.content) ? (
                <Text style={{ fontSize: 36, lineHeight: 44 }}>{item.content}</Text>
              ) : (
                <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
                  <LinkedText style={[styles.msgText, isMine && styles.msgTextMine]} linkColor={isMine ? '#90caf9' : '#1d4ed8'}>{item.content}</LinkedText>
                </View>
              )}
            </TouchableOpacity>
            {!isMine && (
              <View style={styles.msgMeta}>
                {item.unreadCount > 0 && (
                  <Text style={styles.readReceipt}>{item.unreadCount}</Text>
                )}
                <Text style={styles.msgTime}>{formatTime(item.sentAt)}</Text>
              </View>
            )}
          </View>
          {/* 리액션 표시 */}
          {grouped.length > 0 && (
            <View style={[styles.reactionRow, isMine && { justifyContent: 'flex-end' }]}>
              {grouped.map(g => (
                <TouchableOpacity
                  key={g.emoji}
                  style={[styles.reactionChip, g.users.includes(userId) && styles.reactionChipMine]}
                  onPress={() => handleReaction(item.id, 'GROUP', g.emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{g.emoji}</Text>
                  {g.count > 1 && <Text style={styles.reactionCount}>{g.count}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderGroupChat = (room: GroupChatRoomResponse) => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.chatHeaderTitle, { flex: 1 }]}>{room.name}</Text>
        <TouchableOpacity style={styles.memberBadge} onPress={() => setShowMembers(!showMembers)}>
          <Text style={styles.memberBadgeText}>{room.memberCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteGroupRoom(room)} style={styles.leaveRoomBtn}>
          <Text style={styles.leaveRoomBtnText}>나가기</Text>
        </TouchableOpacity>
      </View>

      {/* Members Panel */}
      {showMembers && (
        <View style={styles.membersPanel}>
          <Text style={styles.membersPanelTitle}>참가자 ({room.members.length}명)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
            {room.members.map(m => (
              <View key={m.userId} style={styles.memberItem}>
                <Avatar uri={m.profileImageUrl} name={m.name} size={36} />
                <Text style={styles.memberItemName} numberOfLines={1}>{m.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

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

      {/* Attach Menu */}
      {showAttachMenu && (
        <View style={styles.attachMenu}>
          <TouchableOpacity
            style={styles.attachMenuItem}
            onPress={() => { setShowAttachMenu(false); pickAndSendImage(room.id, true); }}
            activeOpacity={0.7}
          >
            <View style={[styles.attachIconWrap, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="image" size={22} color="#fff" />
            </View>
            <Text style={styles.attachMenuText}>사진</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachMenuItem}
            onPress={() => { setShowAttachMenu(false); pickAndSendFile(room.id, true); }}
            activeOpacity={0.7}
          >
            <View style={[styles.attachIconWrap, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="document" size={22} color="#fff" />
            </View>
            <Text style={styles.attachMenuText}>파일</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Group Typing indicator */}
      {groupTypingUsers.length > 0 && (
        <View style={styles.typingRow}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingName}>{groupTypingUsers.map(u => u.userName).join(', ')}</Text>
            <TypingDots />
          </View>
        </View>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.uploadingText}>파일 전송 중...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          onPress={() => { setShowAttachMenu(v => !v); setShowEmoji(false); }}
          style={styles.emojiBtn}
          activeOpacity={0.7}
        >
          <Ionicons name={showAttachMenu ? 'close-circle' : 'add-circle'} size={26} color={showAttachMenu ? Colors.gray400 : Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setShowEmoji(v => !v); setShowAttachMenu(false); }} style={styles.emojiBtn} activeOpacity={0.7}>
          <Ionicons name={showEmoji ? 'close-circle' : 'happy-outline'} size={24} color={showEmoji ? Colors.gray400 : Colors.primary} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={Colors.gray400}
          defaultValue=""
          onChangeText={(t) => {
            messageTextRef.current = t;
            setHasText(t.trim().length > 0);
            if (t.trim().length > 0) {
              const now = Date.now();
              if (now - lastTypingSentRef.current > 2000) {
                lastTypingSentRef.current = now;
                groupChatAPI.sendTyping(room.id, userId, true).catch(() => {});
              }
            } else {
              groupChatAPI.sendTyping(room.id, userId, false).catch(() => {});
              lastTypingSentRef.current = 0;
            }
          }}
          onFocus={() => { setShowEmoji(false); setShowAttachMenu(false); }}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!hasText || sending) && styles.sendBtnDisabled]}
          onPress={() => {
            handleSendGroup(room.id);
            groupChatAPI.sendTyping(room.id, userId, false).catch(() => {});
          }}
          disabled={!hasText || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.sendBtnText}>전송</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Emoji Panel - 인풋 아래 */}
      {showEmoji && (
        <View style={styles.emojiPanel}>
          <View style={styles.emojiPanelContent}>
            {EMOJI_LIST.map((em, i) => (
              <TouchableOpacity key={i} style={styles.emojiItem} onPress={() => { messageTextRef.current += em; setHasText(true); if (inputRef.current) inputRef.current.setNativeProps({ text: messageTextRef.current }); }}>
                <Text style={styles.emojiText}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  // =========================================================================
  // Image preview modal
  // =========================================================================

  const renderImagePreviewModal = () => (
    <Modal visible={!!imagePreview} transparent animationType="fade" onRequestClose={() => setImagePreview(null)}>
      <View style={styles.imagePreviewOverlay}>
        <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setImagePreview(null)}>
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
        {imagePreview && (
          <Image
            source={{ uri: imagePreview }}
            style={styles.imagePreviewFull}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );

  // =========================================================================
  // Render: Reaction picker modal
  // =========================================================================

  const renderReactionPicker = () => (
    <Modal visible={reactionMsgId !== null} transparent animationType="fade" onRequestClose={() => setReactionMsgId(null)}>
      <TouchableOpacity style={styles.reactionOverlay} activeOpacity={1} onPress={() => setReactionMsgId(null)}>
        <View style={styles.reactionPicker}>
          {REACTION_EMOJIS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionPickerItem}
              onPress={() => reactionMsgId && handleReaction(reactionMsgId, reactionSource, emoji)}
              activeOpacity={0.6}
            >
              <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // =========================================================================
  // Render: Main
  // =========================================================================

  if (view.kind === 'dm-chat') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderDmChat(view.room)}
        {renderImagePreviewModal()}
        {renderReactionPicker()}
      </SafeAreaView>
    );
  }

  if (view.kind === 'group-chat') {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderGroupChat(view.room)}
        {renderImagePreviewModal()}
        {renderReactionPicker()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="chatbubbles" size={33} color="#fff" style={{ marginTop: -3 }} />
          <Text style={styles.screenTitle}>채팅</Text>
        </View>
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
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
  typingBubble: {
    backgroundColor: '#E8E0D0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopLeftRadius: 4,
  },
  typingDots: {
    fontSize: 20,
    color: '#8B7355',
    fontWeight: '700',
    letterSpacing: 2,
  },
  typingName: {
    fontSize: 11,
    color: '#8B7355',
    marginBottom: 2,
    fontWeight: '600',
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
    fontFamily: Fonts.chalk,
    letterSpacing: 2,
  },
  leaveRoomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  leaveRoomBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: HEADER_TOP_PADDING,
    backgroundColor: '#2D5016',
    borderBottomWidth: 3,
    borderBottomColor: '#C49A2A',
    gap: 10,
  },
  backBtn: {
    paddingRight: 4,
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFE156',
  },
  chatHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Fonts.chalk,
    letterSpacing: 2,
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
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 80,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    textAlignVertical: 'center',
  },
  sendBtn: {
    backgroundColor: '#2D5016',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray300,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPanel: {
    backgroundColor: '#FFF3D0',
    borderTopWidth: 1,
    borderTopColor: '#E8C84A',
    height: 150,
  },
  emojiPanelContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  emojiItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 26,
  },
  membersPanel: {
    backgroundColor: Colors.backgroundDeep,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.goldBorder,
  },
  membersPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  memberItem: {
    alignItems: 'center',
    width: 50,
    gap: 4,
  },
  memberItemName: {
    fontSize: 11,
    color: Colors.text,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },

  // Chat image message
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },

  // File message
  fileBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 200,
    maxWidth: 260,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  fileSizeText: {
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 2,
    fontFamily: Fonts.regular,
  },

  // Attach menu
  attachMenu: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 32,
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
  },
  attachMenuItem: {
    alignItems: 'center',
    gap: 6,
  },
  attachIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachMenuText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: Fonts.regular,
  },

  // Uploading bar
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#FFF8E7',
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
  },
  uploadingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Fonts.regular,
  },

  // Image preview modal
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imagePreviewFull: {
    width: '90%',
    height: '80%',
  },

  // Reaction styles
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reactionChipMine: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 3,
    fontWeight: '600',
  },
  reactionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    gap: 2,
  },
  reactionPickerItem: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  reactionPickerEmoji: {
    fontSize: 28,
  },
});
