import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, AppState } from 'react-native';
import { Client } from '@stomp/stompjs';
import { WS_BASE_URL } from '../constants/config';

// 뱃지 상태 Context — 하위 컴포넌트에서 직접 뱃지 제어 가능
interface BadgeContextType {
  setChatUnread: (v: boolean) => void;
  setReunionUnread: (v: boolean) => void;
  recheckChatUnread: () => void;
  recheckReunionUnread: () => void;
}
const BadgeContext = createContext<BadgeContextType>({
  setChatUnread: () => {},
  setReunionUnread: () => {},
  recheckChatUnread: () => {},
  recheckReunionUnread: () => {},
});
export const useBadge = () => useContext(BadgeContext);
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import { chatAPI } from '../api/chat';
import { reunionAPI } from '../api/reunion';
import { groupChatAPI } from '../api/groupChat';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import MySchoolScreen from '../screens/MySchoolScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import ChatScreen from '../screens/ChatScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ReunionScreen from '../screens/ReunionScreen';
import AlumniShopScreen from '../screens/AlumniShopScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ClassmateFriendsScreen from '../screens/ClassmateFriendsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

const commonScreens = (StackNav: ReturnType<typeof createStackNavigator>) => (
  <>
    <StackNav.Screen name="Messages" component={MessagesScreen} />
    <StackNav.Screen name="Notifications" component={NotificationsScreen} />
    <StackNav.Screen name="Profile" component={ProfileScreen} />
  </>
);

const MySchoolStackNav = createStackNavigator();
function MySchoolStack() {
  return (
    <MySchoolStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MySchoolStackNav.Screen name="MySchoolHome" component={MySchoolScreen} />
      <MySchoolStackNav.Screen name="Board" component={DashboardScreen} />
      <MySchoolStackNav.Screen name="CreatePost" component={CreatePostScreen} />
      <MySchoolStackNav.Screen name="EditPost" component={CreatePostScreen} />
      <MySchoolStackNav.Screen name="PostDetail" component={PostDetailScreen} />
      {commonScreens(MySchoolStackNav)}
    </MySchoolStackNav.Navigator>
  );
}

const FriendsStackNav = createStackNavigator();
function FriendsStack() {
  return (
    <FriendsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <FriendsStackNav.Screen name="FriendsHome" component={ClassmateFriendsScreen} />
      {commonScreens(FriendsStackNav)}
    </FriendsStackNav.Navigator>
  );
}

const ChatStackNav = createStackNavigator();
function ChatStack() {
  return (
    <ChatStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ChatStackNav.Screen name="ChatHome" component={ChatScreen} />
      {commonScreens(ChatStackNav)}
    </ChatStackNav.Navigator>
  );
}

const ReunionStackNav = createStackNavigator();
function ReunionStack() {
  return (
    <ReunionStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ReunionStackNav.Screen name="ReunionHome" component={ReunionScreen} />
      <ReunionStackNav.Screen name="PostDetail" component={PostDetailScreen} />
      {commonScreens(ReunionStackNav)}
    </ReunionStackNav.Navigator>
  );
}

const ShopStackNav = createStackNavigator();
function ShopStack() {
  return (
    <ShopStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ShopStackNav.Screen name="ShopHome" component={AlumniShopScreen} />
      {commonScreens(ShopStackNav)}
    </ShopStackNav.Navigator>
  );
}

const TAB_CONFIG = [
  { name: 'MySchool', label: '우리학교', icon: 'school' as const },
  { name: 'Friends', label: '내동창친구', icon: 'person-add' as const },
  { name: 'Chat', label: '채팅', icon: 'chatbubbles' as const },
  { name: 'Reunion', label: '찐모임', icon: 'people' as const },
  { name: 'Shop', label: '동창이네', icon: 'storefront' as const },
];

// 커스텀 탭바: 탭 클릭 시 해당 탭의 중첩 스택 상태를 완전히 초기화
function CustomTabBar({ state, navigation, chatUnread, reunionUnread }: any) {
  const insets = useSafeAreaInsets();
  const handleTabPress = (tabName: string, tabIndex: number) => {
    // 모든 탭의 key를 새로 생성 → React Navigation이 완전히 새 라우트로 인식
    navigation.reset({
      index: tabIndex,
      routes: state.routes.map((r: any) => ({
        name: r.name,
        key: `${r.name}-${Date.now()}`,
      })),
    });
  };

  return (
    <View style={[tabStyles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route: any, index: number) => {
        const config = TAB_CONFIG.find(t => t.name === route.name);
        if (!config) return null;
        const isFocused = state.index === index;
        const color = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.45)';

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => handleTabPress(config.name, index)}
            style={tabStyles.tab}
          >
            <View>
              <Ionicons name={config.icon} size={24} color={color} />
              {config.name === 'Chat' && chatUnread && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>N</Text>
                </View>
              )}
              {config.name === 'Reunion' && reunionUnread && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>N</Text>
                </View>
              )}
            </View>
            <Text style={[tabStyles.label, { color }]}>{config.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#2D5016',
    borderTopColor: '#C49A2A',
    borderTopWidth: 4,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Gaegu_700Bold',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});

function MainTabs() {
  const { user } = useAuth();
  const [chatUnread, setChatUnread] = useState(false);
  const [reunionUnread, setReunionUnread] = useState(false);
  const initialTab = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('inviteCode')
    ? 'Reunion' : null;

  // 채팅 N뱃지: WebSocket으로 즉시 감지 + 폴링 fallback (5초)
  const stompRef = useRef<Client | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const checkChatUnread = async () => {
    if (!user?.userId) return;
    try {
      const [dmRooms, groupRooms] = await Promise.all([
        chatAPI.getMyChatRooms(user.userId),
        groupChatAPI.getMyRooms(user.userId),
      ]);
      const chatGroupRooms = groupRooms.filter(r => !r.name.startsWith('[찐모임]'));
      const hasUnread = dmRooms.some(r => r.unreadCount > 0) || chatGroupRooms.some(r => r.unreadCount > 0);
      setChatUnread(hasUnread);
    } catch {}
  };

  useEffect(() => {
    if (!user?.userId) return;

    // WebSocket 연결 — 새 메시지 알림 즉시 수신
    const wsUrl = WS_BASE_URL.replace(/^http/, 'ws') + '/websocket';
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      forceBinaryWSFrames: false,
      appendMissingNULLonIncoming: true,
      webSocketFactory: () => new WebSocket(wsUrl),
      onConnect: () => {
        // 유저별 채팅 알림 구독 — 즉시 실제 unread 체크 (채팅방 열고 있으면 이미 읽었으므로 N 안 뜸)
        client.subscribe(`/topic/user/${user.userId}/chat-notify`, () => {
          checkChatUnread();
        });
        // 유저별 찐모임 알림 구독
        client.subscribe(`/topic/user/${user.userId}/reunion-notify`, () => {
          checkReunionUnread();
        });
      },
    });
    client.activate();
    stompRef.current = client;

    // 초기 체크 + 폴링 fallback (5초)
    checkChatUnread();
    const interval = setInterval(checkChatUnread, 5000);

    // AppState: 포그라운드 복귀 시 즉시 체크
    const appSub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        checkChatUnread();
        if (!client.connected) client.activate();
      }
    });

    return () => {
      clearInterval(interval);
      appSub.remove();
      if (client.active) client.deactivate();
    };
  }, [user?.userId]);

  // 찐모임 N뱃지 체크 함수
  const checkReunionUnread = async () => {
    if (!user?.userId) return;
    try {
        const reunions = await reunionAPI.getMyReunions(user.userId);
        const groupRooms = await groupChatAPI.getMyRooms(user.userId);
        let hasUnread = false;
        for (const r of reunions) {
          if (r.chatRoomId) {
            const room = groupRooms.find(gr => gr.id === r.chatRoomId);
            if ((room?.unreadCount || 0) > 0) { hasUnread = true; break; }
          }
          if (!hasUnread) {
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              const lastStr = await AsyncStorage.getItem(`reunion_feed_${r.id}`);
              if (lastStr) {
                const last = parseInt(lastStr, 10);
                const posts = await reunionAPI.getPosts(r.id, user.userId);
                if (posts.some((p: any) => new Date(p.createdAt).getTime() > last)) { hasUnread = true; break; }
              }
            } catch {}
          }
          if (!hasUnread && (r.myRole === 'LEADER' || r.myRole === 'ADMIN')) {
            try {
              const reqs = await reunionAPI.getJoinRequests(r.id, user.userId);
              if (reqs.some((req: any) => req.status === 'PENDING')) { hasUnread = true; break; }
            } catch {}
          }
        }
        setReunionUnread(hasUnread);
      } catch {}
  };

  useEffect(() => {
    if (!user?.userId) return;
    checkReunionUnread();
    const interval = setInterval(checkReunionUnread, 10000);
    return () => clearInterval(interval);
  }, [user?.userId]);

  const badgeCtx: BadgeContextType = {
    setChatUnread,
    setReunionUnread,
    recheckChatUnread: checkChatUnread,
    recheckReunionUnread: checkReunionUnread,
  };

  return (
    <BadgeContext.Provider value={badgeCtx}>
    <Tab.Navigator
      initialRouteName={initialTab || 'MySchool'}
      tabBar={(props) => <CustomTabBar {...props} chatUnread={chatUnread} reunionUnread={reunionUnread} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="MySchool" component={MySchoolStack} />
      <Tab.Screen name="Friends" component={FriendsStack} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="Reunion" component={ReunionStack} />
      <Tab.Screen name="Shop" component={ShopStack} />
    </Tab.Navigator>
    </BadgeContext.Provider>
  );
}

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="로딩 중..." />;

  return (
    <NavigationContainer>
      {user ? <RootStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
