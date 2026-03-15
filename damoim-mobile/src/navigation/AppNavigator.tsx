import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import { chatAPI } from '../api/chat';

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
function CustomTabBar({ state, navigation, chatUnread }: any) {
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

  useEffect(() => {
    if (!user?.userId) return;
    let prev = false;
    const check = async () => {
      try {
        const rooms = await chatAPI.getMyChatRooms(user.userId);
        const hasUnread = rooms.some(r => r.unreadCount > 0);
        if (prev !== hasUnread) { prev = hasUnread; setChatUnread(hasUnread); }
      } catch {}
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [user?.userId]);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} chatUnread={chatUnread} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="MySchool" component={MySchoolStack} />
      <Tab.Screen name="Friends" component={FriendsStack} />
      <Tab.Screen name="Chat" component={ChatStack} />
      <Tab.Screen name="Reunion" component={ReunionStack} />
      <Tab.Screen name="Shop" component={ShopStack} />
    </Tab.Navigator>
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
