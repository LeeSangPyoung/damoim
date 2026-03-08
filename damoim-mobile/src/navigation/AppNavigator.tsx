import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';

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

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
      <Tab.Screen name="Friends" component={ClassmateFriendsScreen} options={{ tabBarLabel: '내동창친구' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: '채팅' }} />
      <Tab.Screen name="Reunion" component={ReunionScreen} options={{ tabBarLabel: '찐모임' }} />
      <Tab.Screen name="Shop" component={AlumniShopScreen} options={{ tabBarLabel: '동창이네' }} />
    </Tab.Navigator>
  );
}

function MySchoolStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MySchoolHome" component={MySchoolScreen} />
      <Stack.Screen name="Board" component={DashboardScreen} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
    </Stack.Navigator>
  );
}

// 루트 스택: 탭 + 공통 화면 (알림, 쪽지, 프로필)
function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
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
