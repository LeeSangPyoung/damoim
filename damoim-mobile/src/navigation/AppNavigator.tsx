import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
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

// 공통 화면(프로필, 쪽지, 알림)을 각 탭 스택에 추가하는 헬퍼
const commonScreens = (Stack: ReturnType<typeof createStackNavigator>) => (
  <>
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </>
);

const MySchoolStackNav = createStackNavigator();
function MySchoolStack() {
  return (
    <MySchoolStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MySchoolStackNav.Screen name="MySchoolHome" component={MySchoolScreen} />
      <MySchoolStackNav.Screen name="Board" component={DashboardScreen} />
      <MySchoolStackNav.Screen name="CreatePost" component={CreatePostScreen} />
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: {
          backgroundColor: '#2D5016',
          borderTopColor: '#C49A2A',
          borderTopWidth: 4,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', fontFamily: 'Gaegu_700Bold' },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'MySchool': iconName = 'school'; break;
            case 'Chat': iconName = 'chatbubbles'; break;
            case 'Reunion': iconName = 'people'; break;
            case 'Shop': iconName = 'storefront'; break;
            case 'Friends': iconName = 'person-add'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="MySchool" component={MySchoolStack} options={{ tabBarLabel: '우리학교' }} />
      <Tab.Screen name="Friends" component={FriendsStack} options={{ tabBarLabel: '내동창친구' }} />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          tabBarLabel: '채팅',
          tabBarBadge: chatUnread ? 'N' : undefined,
          tabBarBadgeStyle: { backgroundColor: '#FF3B30', fontSize: 9, fontWeight: '800', minWidth: 16, height: 16, lineHeight: 15, borderRadius: 8 },
        }}
      />
      <Tab.Screen name="Reunion" component={ReunionStack} options={{ tabBarLabel: '찐모임' }} />
      <Tab.Screen name="Shop" component={ShopStack} options={{ tabBarLabel: '동창이네' }} />
    </Tab.Navigator>
  );
}

// 루트 스택: 탭만 (공통 화면은 각 탭 내부 스택에 포함)
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
