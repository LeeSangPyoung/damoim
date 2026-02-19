import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuthData, clearAuthData } from '../utils/auth';
import { userAPI, ClassmateInfo, ProfileResponse } from '../api/user';
import { chatAPI } from '../api/chat';
import { friendAPI, FriendResponse } from '../api/friend';
import { notificationAPI, NotificationResponse } from '../api/notification';
import { authAPI } from '../api/auth';
import ProfileModal from './ProfileModal';
import ComposeMessageModal from './ComposeMessageModal';
import ConfirmationModal from './ConfirmationModal';
import './Dashboard.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isCompactPage = location.pathname === '/profile/edit';
  const isDashboard = location.pathname === '/dashboard';
  const isBoard = location.pathname === '/board';
  const isAdmin = location.pathname === '/admin';
  const boardSchoolName = searchParams.get('school') || '';
  const boardGraduationYear = searchParams.get('year') || '';
  const boardSchoolCode = searchParams.get('code') || '';
  const boardTab = searchParams.get('tab') || 'all';
  const [user, setUser] = useState<{ userId: string; name: string; email: string; role?: string } | null>(null);

  const [classmates, setClassmates] = useState<ClassmateInfo[]>([]);
  const [totalClassmates, setTotalClassmates] = useState<number>(0);

  // 프로필 모달
  const [selectedProfile, setSelectedProfile] = useState<ProfileResponse | null>(null);

  // 쪽지 보내기 모달
  const [messageTarget, setMessageTarget] = useState<{ userId: string; name: string } | null>(null);

  // 친구 요청 확인 다이얼로그
  const [friendConfirmTarget, setFriendConfirmTarget] = useState<ClassmateInfo | null>(null);

  // 성공 알림
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // 친구 상태 관리
  const [friendStatuses, setFriendStatuses] = useState<Record<string, string>>({});
  const [friendshipIds, setFriendshipIds] = useState<Record<string, number>>({});

  // 받은 친구 요청
  const [pendingRequests, setPendingRequests] = useState<FriendResponse[]>([]);

  // 내 친구 목록
  const [myFriends, setMyFriends] = useState<FriendResponse[]>([]);

  // 보낸 친구 요청
  const [sentRequests, setSentRequests] = useState<FriendResponse[]>([]);

  // 내 친구 섹션 탭
  const [friendTab, setFriendTab] = useState<'friends' | 'requests'>('friends');

  // 알림 시스템
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);

  // 사용자 드롭다운
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // 친구 학교 정보
  const [friendSchools, setFriendSchools] = useState<Record<string, string>>({});

  useEffect(() => {
    const { user: userData } = getAuthData();
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(userData);
    loadPendingRequests(userData.userId);
    loadMyFriends(userData.userId);
    loadSentRequests(userData.userId);
    loadNotifications(userData.userId);
    loadUnreadNotifCount(userData.userId);
  }, [navigate]);

  // 접속 중인 동창: 항상 전체 학교 동창 로드 (게시판 탭과 무관)
  useEffect(() => {
    if (!user) return;
    loadData(user.userId);
  }, [user?.userId]);

  // Heartbeat - 활동 시간 업데이트 (2분마다)
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(async () => {
      try {
        await authAPI.heartbeat(user.userId);
      } catch (error) {
        console.error('Heartbeat 실패:', error);
      }
    }, 2 * 60 * 1000); // 2분

    return () => clearInterval(intervalId);
  }, [user?.userId]);

  // 친구 목록 및 요청 자동 새로고침 (10초마다)
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      loadPendingRequests(user.userId);
      loadMyFriends(user.userId);
      loadSentRequests(user.userId);
    }, 10 * 1000); // 10초

    return () => clearInterval(intervalId);
  }, [user?.userId]);

  // 동창 목록 자동 새로고침 (10초마다)
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      loadData(user.userId);
    }, 10 * 1000); // 10초

    return () => clearInterval(intervalId);
  }, [user?.userId]);

  // 창 닫을 때 로그아웃 시도
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = async () => {
      try {
        // sendBeacon을 사용하여 비동기 요청이 완료되지 않아도 전송되도록 함
        const blob = new Blob([JSON.stringify({ userId: user.userId })], { type: 'application/json' });
        navigator.sendBeacon('http://localhost:8080/api/auth/logout', blob);
      } catch (error) {
        console.error('로그아웃 실패:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.userId]);

  // WebSocket 알림 구독
  useEffect(() => {
    if (!user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe(`/topic/notifications/${user.userId}`, (message) => {
          const newNotif: NotificationResponse = JSON.parse(message.body);
          setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
          setUnreadNotifCount(prev => prev + 1);

          // 친구 요청/수락 알림 시 사이드바 새로고침
          if (newNotif.type === 'FRIEND_REQUEST') {
            loadPendingRequests();
          } else if (newNotif.type === 'FRIEND_ACCEPTED') {
            loadMyFriends();
            loadSentRequests();
          }
        });
      },
      reconnectDelay: 5000,
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [user?.userId]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async (userId?: string) => {
    const targetId = userId || user?.userId;
    if (!targetId) return;
    try {
      const data = await notificationAPI.getNotifications(targetId);
      setNotifications(data);
    } catch (error) {
      console.error('알림 로드 실패:', error);
    }
  };

  const loadUnreadNotifCount = async (userId?: string) => {
    const targetId = userId || user?.userId;
    if (!targetId) return;
    try {
      const count = await notificationAPI.getUnreadCount(targetId);
      setUnreadNotifCount(count);
    } catch (error) {
      console.error('읽지 않은 알림 수 로드 실패:', error);
    }
  };

  const handleNotifClick = async (notif: NotificationResponse) => {
    if (!user) return;

    // 읽음 처리
    if (!notif.read) {
      try {
        await notificationAPI.markAsRead(notif.id, user.userId);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
      }
    }

    // 관련 페이지로 이동
    setShowNotifDropdown(false);
    switch (notif.type) {
      case 'MESSAGE':
        navigate('/messages');
        break;
      case 'CHAT':
      case 'GROUP_CHAT':
        navigate('/chat');
        break;
      case 'COMMENT':
      case 'LIKE':
        navigate('/dashboard');
        break;
      case 'FRIEND_REQUEST':
      case 'FRIEND_ACCEPTED':
        // 현재 페이지 유지 (사이드바에서 확인)
        break;
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await notificationAPI.markAllAsRead(user.userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifCount(0);
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error);
    }
  };

  const getNotifIcon = (type: string) => {
    const s = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (type) {
      case 'MESSAGE': return <svg {...s}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
      case 'FRIEND_REQUEST': return <svg {...s}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
      case 'FRIEND_ACCEPTED': return <svg {...s}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 6 9 17l-5-5" style={{stroke: '#22c55e'}}/></svg>;
      case 'COMMENT': return <svg {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
      case 'LIKE': return <svg {...s} style={{color: '#ef4444'}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/></svg>;
      case 'CHAT': return <svg {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
      case 'GROUP_CHAT': return <svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
      default: return <svg {...s}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"/></svg>;
    }
  };

  const formatNotifTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
  };

  const loadData = async (userId: string) => {
    try {
      const profileData = await userAPI.getProfile(userId);

      // 접속 중인 동창: 항상 모든 학교의 동창을 합쳐서 로드 (병렬 처리)
      if (profileData.schools && profileData.schools.length > 0) {
        const allClassmatesMap = new Map<string, ClassmateInfo>();

        // 모든 학교 검색을 병렬로 실행
        const searchPromises = profileData.schools
          .filter(school => school.schoolCode && school.graduationYear)
          .map(school =>
            userAPI.searchClassmates(
              userId,
              school.schoolCode!,
              school.graduationYear!.toString()
            ).catch(error => {
              console.error(`학교 ${school.schoolName} 동창 로드 실패:`, error);
              return { classmates: [], totalCount: 0 };
            })
          );

        const allResults = await Promise.all(searchPromises);

        // 결과 병합
        for (const classmatesData of allResults) {
          for (const classmate of classmatesData.classmates) {
            // 학교 정보 포맷팅 (프로필 로드 없이 기존 데이터 사용)
            const shortName = classmate.school.schoolName
              .replace('초등학교', '초')
              .replace('중학교', '중')
              .replace('고등학교', '고');
            let formattedSchoolName = `${shortName}(${classmate.school.graduationYear})`;

            // 같은 반이었는지 확인
            const isSameClass = profileData.schools?.some(mySchool =>
              mySchool.schoolCode === classmate.school.schoolCode &&
              mySchool.graduationYear === classmate.school.graduationYear &&
              mySchool.grade === classmate.school.grade &&
              mySchool.classNumber === classmate.school.classNumber
            );

            if (isSameClass) {
              formattedSchoolName += ' 🧑‍🤝‍🧑';
            }

            if (!allClassmatesMap.has(classmate.userId)) {
              // 처음 발견된 동창
              allClassmatesMap.set(classmate.userId, {
                ...classmate,
                school: {
                  ...classmate.school,
                  schoolName: formattedSchoolName
                }
              });
            } else {
              // 이미 있는 동창 - 학교 정보 추가 (중복 체크)
              const existing = allClassmatesMap.get(classmate.userId)!;
              if (!existing.school.schoolName.includes(formattedSchoolName)) {
                existing.school.schoolName += `, ${formattedSchoolName}`;
              }
            }
          }
        }

        setClassmates(Array.from(allClassmatesMap.values()));
        setTotalClassmates(allClassmatesMap.size);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  const loadPendingRequests = async (userId?: string) => {
    const targetId = userId || user?.userId;
    if (!targetId) return;
    try {
      const data = await friendAPI.getPendingRequests(targetId);
      setPendingRequests(data);

      // 내 학교 정보 로드
      const myProfile = await userAPI.getProfile(targetId);

      // 각 요청자의 학교 정보 로드
      const schoolInfo: Record<string, string> = {};
      for (const request of data) {
        try {
          const profile = await userAPI.getProfile(request.userId);
          if (profile.schools && profile.schools.length > 0) {
            const schoolDetails = profile.schools.map(school => {
              const shortName = school.schoolName.replace('초등학교', '초').replace('중학교', '중').replace('고등학교', '고');
              return `${shortName}(${school.graduationYear})`;
            });

            schoolInfo[request.userId] = schoolDetails.join(', ');
          }
        } catch (error) {
          console.error(`요청자 ${request.userId} 학교 정보 로드 실패:`, error);
        }
      }
      setFriendSchools(prev => ({ ...prev, ...schoolInfo }));
    } catch (error) {
      console.error('친구 요청 로드 실패:', error);
    }
  };

  const loadMyFriends = async (userId?: string) => {
    const targetId = userId || user?.userId;
    if (!targetId) return;
    try {
      const data = await friendAPI.getMyFriends(targetId);
      setMyFriends(data);

      // 내 학교 정보 로드
      const myProfile = await userAPI.getProfile(targetId);

      // 각 친구의 학교 정보 로드
      const schoolInfo: Record<string, string> = {};
      for (const friend of data) {
        try {
          const profile = await userAPI.getProfile(friend.userId);
          if (profile.schools && profile.schools.length > 0) {
            const schoolDetails = profile.schools.map(school => {
              const shortName = school.schoolName.replace('초등학교', '초').replace('중학교', '중').replace('고등학교', '고');
              return `${shortName}(${school.graduationYear})`;
            });

            schoolInfo[friend.userId] = schoolDetails.join(', ');
          }
        } catch (error) {
          console.error(`친구 ${friend.userId} 학교 정보 로드 실패:`, error);
        }
      }
      setFriendSchools(prev => ({ ...prev, ...schoolInfo }));
    } catch (error) {
      console.error('친구 목록 로드 실패:', error);
    }
  };

  const loadSentRequests = async (userId?: string) => {
    const targetId = userId || user?.userId;
    if (!targetId) return;
    try {
      const data = await friendAPI.getSentRequests(targetId);
      setSentRequests(data);

      // 내 학교 정보 로드
      const myProfile = await userAPI.getProfile(targetId);

      // 각 수신자의 학교 정보 로드
      const schoolInfo: Record<string, string> = {};
      for (const request of data) {
        try {
          const profile = await userAPI.getProfile(request.userId);
          if (profile.schools && profile.schools.length > 0) {
            const schoolDetails = profile.schools.map(school => {
              const shortName = school.schoolName.replace('초등학교', '초').replace('중학교', '중').replace('고등학교', '고');
              return `${shortName}(${school.graduationYear})`;
            });

            schoolInfo[request.userId] = schoolDetails.join(', ');
          }
        } catch (error) {
          console.error(`수신자 ${request.userId} 학교 정보 로드 실패:`, error);
        }
      }
      setFriendSchools(prev => ({ ...prev, ...schoolInfo }));
    } catch (error) {
      console.error('보낸 요청 로드 실패:', error);
    }
  };

  const handleAcceptFriend = async (friendshipId: number, name: string) => {
    if (!user) return;
    try {
      await friendAPI.acceptRequest(friendshipId, user.userId);
      setPendingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
      setConfirmationMessage(`${name}님과 친구가 되었습니다!`);
      loadPendingRequests();
      loadMyFriends();
    } catch (error) {
      console.error('친구 수락 실패:', error);
    }
  };

  const handleRejectFriend = async (friendshipId: number) => {
    if (!user) return;
    try {
      await friendAPI.removeFriendship(friendshipId, user.userId);
      setPendingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
    } catch (error) {
      console.error('친구 거절 실패:', error);
    }
  };

  const handleLogout = async () => {
    if (!user) return;
    try {
      await authAPI.logout(user.userId);
    } catch (error) {
      console.error('로그아웃 API 실패:', error);
    }
    clearAuthData();
    navigate('/login');
  };

  const handleStartChat = async (classmateUserId: string) => {
    if (!user) return;
    try {
      const data = await chatAPI.createOrGetRoom(user.userId, classmateUserId);
      navigate(`/chat?roomId=${data.roomId}`);
    } catch (error: any) {
      console.error('채팅방 생성 실패:', error);
    }
  };

  const handleOpenProfile = async (classmateUserId: string) => {
    try {
      const profileData = await userAPI.getProfile(classmateUserId);
      setSelectedProfile(profileData);
    } catch (error) {
      console.error('프로필 로드 실패:', error);
    }
  };

  // 동창 목록 로드 후 친구 상태 조회
  useEffect(() => {
    if (!user || classmates.length === 0) return;
    const loadStatuses = async () => {
      const statuses: Record<string, string> = {};
      const ids: Record<string, number> = {};
      await Promise.all(
        classmates.map(async (c) => {
          try {
            const res = await friendAPI.getStatus(user.userId, c.userId);
            statuses[c.userId] = res.status;
            if (res.friendshipId) ids[c.userId] = res.friendshipId;
          } catch {
            statuses[c.userId] = 'NONE';
          }
        })
      );
      setFriendStatuses(statuses);
      setFriendshipIds(ids);
    };
    loadStatuses();
  }, [user, classmates]);

  // 친구 요청 실제 처리
  const handleConfirmAddFriend = async () => {
    if (!user || !friendConfirmTarget) return;
    const classmate = friendConfirmTarget;
    setFriendConfirmTarget(null);
    try {
      const res = await friendAPI.sendRequest(user.userId, classmate.userId);
      setFriendStatuses(prev => ({ ...prev, [classmate.userId]: 'SENT' }));
      setFriendshipIds(prev => ({ ...prev, [classmate.userId]: res.friendshipId }));
      setConfirmationMessage(`${classmate.name}님에게 친구 요청을 보냈습니다!`);
      loadSentRequests();
    } catch (error: any) {
      const msg = error?.response?.data?.error || '친구 요청에 실패했습니다.';
      setConfirmationMessage(msg);
    }
  };

  // 친구 요청 취소
  const handleCancelFriendRequest = async (targetUserId: string, targetName: string) => {
    if (!user) return;
    const fId = friendshipIds[targetUserId];
    if (!fId) return;
    try {
      await friendAPI.removeFriendship(fId, user.userId);
      setFriendStatuses(prev => ({ ...prev, [targetUserId]: 'NONE' }));
      setFriendshipIds(prev => { const next = { ...prev }; delete next[targetUserId]; return next; });
      setConfirmationMessage(`${targetName}님에게 보낸 친구 요청을 취소했습니다.`);
      loadSentRequests();
    } catch (error: any) {
      const msg = error?.response?.data?.error || '요청 취소에 실패했습니다.';
      setConfirmationMessage(msg);
    }
  };

  // 보낸 요청 취소 (요청 관리 탭에서)
  const handleCancelSentRequest = async (friendshipId: number, name: string) => {
    if (!user) return;
    try {
      await friendAPI.removeFriendship(friendshipId, user.userId);
      setSentRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
      setConfirmationMessage(`${name}님에게 보낸 요청을 취소했습니다.`);
    } catch (error: any) {
      setConfirmationMessage(error?.response?.data?.error || '요청 취소에 실패했습니다.');
    }
  };

  if (!user) {
    return <div className="dash-container">로딩 중...</div>;
  }

  return (
    <div className={`dash-container${isCompactPage ? ' dash-compact' : ''}`}>
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-logo" onClick={() => navigate('/dashboard')} style={{cursor: 'pointer'}}>
            <svg className="dash-logo-svg" width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 둥근 사각형 배경 */}
              <rect x="4" y="4" width="92" height="92" rx="22" fill="#4a4a4a" />
              {/* 왼쪽 사람 */}
              <circle cx="38" cy="32" r="10" fill="white" />
              <path d="M24 58c0-8 6.3-14 14-14s14 6 14 14" fill="white" />
              {/* 오른쪽 사람 */}
              <circle cx="62" cy="32" r="10" fill="white" opacity="0.85" />
              <path d="M48 58c0-8 6.3-14 14-14s14 6 14 14" fill="white" opacity="0.85" />
              {/* 밑줄 - 반(class)을 상징하는 칠판/교실 라인 */}
              <rect x="20" y="66" width="60" height="4" rx="2" fill="white" opacity="0.9" />
              <rect x="28" y="76" width="44" height="4" rx="2" fill="white" opacity="0.6" />
            </svg>
            <h1>우리반</h1>
          </div>
          <nav className="dash-nav">
            <a href="#" onClick={() => navigate('/dashboard')} className="dash-nav-link">홈</a>
            <a href="#" onClick={() => navigate('/search')} className="dash-nav-link">동창찾기</a>
            <a href="#" onClick={() => navigate('/messages')} className="dash-nav-link">쪽지</a>
            <a href="#" onClick={() => navigate('/chat')} className="dash-nav-link">채팅</a>
            {user?.role === 'ADMIN' && (
              <a href="#" onClick={() => navigate('/admin')} className="dash-nav-link" style={{color: '#7c3aed', fontWeight: 600}}>🛡️ 관리자</a>
            )}
          </nav>
          <div className="dash-header-right">
            {/* 알림 벨 */}
            <div className="notif-wrapper" ref={notifDropdownRef}>
              <button
                className="notif-bell-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                title="알림"
              >
                <svg className="notif-bell-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifCount > 0 && (
                  <span className="notif-badge">{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <h3>알림</h3>
                    {unreadNotifCount > 0 && (
                      <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                        모두 읽음
                      </button>
                    )}
                  </div>
                  <div className="notif-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">새로운 알림이 없습니다</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`notif-item ${!notif.read ? 'notif-unread' : ''}`}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <div className="notif-item-icon">{getNotifIcon(notif.type)}</div>
                          <div className="notif-item-content">
                            <div className="notif-item-text">{notif.content}</div>
                            <div className="notif-item-time">{formatNotifTime(notif.createdAt)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-menu-wrapper" ref={userDropdownRef}>
              <div
                className="dash-user"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{ cursor: 'pointer' }}
              >
                <div className="dash-user-avatar">{user?.name[0] || '사'}</div>
                <span>{user?.name || '사용자'}</span>
                <span className="user-menu-arrow">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition: 'transform 0.2s', transform: showUserDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </span>
              </div>

              {showUserDropdown && (
                <div className="user-dropdown">
                  <div
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserDropdown(false);
                      handleOpenProfile(user.userId);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    내 프로필
                  </div>
                  <div
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowUserDropdown(false);
                      navigate('/profile/edit');
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    내 정보 수정
                  </div>
                  <div className="user-dropdown-divider" />
                  <div
                    className="user-dropdown-item user-dropdown-logout"
                    onClick={() => {
                      setShowUserDropdown(false);
                      handleLogout();
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    로그아웃
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 웰컴 배너 - 검은띠 */}
      {user && (
        <div className="welcome-banner-top">
          <span>반가워요, <strong>{user.name}</strong>님! 오늘 <strong>{classmates.length}</strong>명의 동창이 접속 중이에요</span>
        </div>
      )}

      <div className="dash-content">
        <div className={`dash-grid${isAdmin ? ' dash-grid-full' : ''}`}>
          <main className="dash-main">
            {!isDashboard && isBoard && (
              <div className="dash-welcome">
                <div>
                  <h2>{boardSchoolName} 게시판</h2>
                  <p>{boardGraduationYear}년 졸업 · 동창 {totalClassmates}명</p>
                </div>
              </div>
            )}
            {children}
          </main>

          {!isAdmin && <aside className="dash-sidebar">
            <div className="dash-card dash-card-grow">
              <div className="dash-card-title">
                <h3>접속 중인 동창</h3>
                <span className="dash-badge">{classmates.length}</span>
              </div>
              <div className="dash-users">
                {classmates.map(classmate => (
                  <div
                    key={classmate.id}
                    className="dash-user-item"
                  >
                    <div className="dash-user-avatar-wrap" onClick={() => handleOpenProfile(classmate.userId)} style={{ cursor: 'pointer', position: 'relative' }}>
                      <div className="dash-user-avatar-sm">{classmate.name[0]}</div>
                      <span className="dash-online-dot"></span>
                    </div>
                    <div className="dash-user-info" onClick={() => handleOpenProfile(classmate.userId)} style={{ cursor: 'pointer' }}>
                      <div className="dash-user-name">{classmate.name}</div>
                      <div className="dash-user-school">
                        {classmate.school.schoolName.split(', ').map((school, idx) => (
                          <div key={idx}>{school}</div>
                        ))}
                      </div>
                    </div>
                    <div className="dash-action-btns">
                      <button className="dash-action-btn" onClick={() => handleStartChat(classmate.userId)} title="채팅">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </button>
                      <button className="dash-action-btn" onClick={() => setMessageTarget({ userId: classmate.userId, name: classmate.name })} title="쪽지">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                      </button>
                      {friendStatuses[classmate.userId] === 'FRIEND' ? (
                        <button className="dash-action-btn dash-action-btn-done" title="친구">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </button>
                      ) : friendStatuses[classmate.userId] === 'SENT' ? (
                        <button className="dash-action-btn dash-action-btn-pending" title="요청 취소" onClick={() => handleCancelFriendRequest(classmate.userId, classmate.name)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </button>
                      ) : (
                        <button className="dash-action-btn" onClick={() => setFriendConfirmTarget(classmate)} title="친구 추가">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dash-card dash-card-grow">
              <div className="dash-friend-tabs">
                <button
                  className={`dash-friend-tab ${friendTab === 'friends' ? 'active' : ''}`}
                  onClick={() => setFriendTab('friends')}
                >
                  내 친구
                  <span className="dash-friend-tab-count">{myFriends.length}</span>
                </button>
                <button
                  className={`dash-friend-tab ${friendTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setFriendTab('requests')}
                >
                  요청 관리
                  {(pendingRequests.length + sentRequests.length) > 0 && (
                    <span className="dash-friend-tab-count dash-friend-tab-count-alert">
                      {pendingRequests.length + sentRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {friendTab === 'friends' && (
                <>
                  {myFriends.length === 0 ? (
                    <div className="dash-friend-empty">아직 친구가 없습니다.</div>
                  ) : (
                    <div className="dash-friend-list">
                      {myFriends.map(friend => {
                        const isOnline = classmates.some(c => c.userId === friend.userId);
                        return (
                        <div key={friend.friendshipId} className="dash-friend-item">
                          <div className="dash-user-avatar-wrap">
                            <div className="dash-user-avatar-sm" style={{ background: isOnline ? '#f59e0b' : '#e8e3dc', color: isOnline ? 'white' : '#8b7d6b' }}>{friend.name[0]}</div>
                            {isOnline && <span className="dash-online-dot"></span>}
                          </div>
                          <div className="dash-friend-item-info" onClick={() => handleOpenProfile(friend.userId)} style={{ cursor: 'pointer' }}>
                            <div className="dash-user-name">{friend.name}</div>
                            <div className="dash-user-school">{friendSchools[friend.userId] || '@' + friend.userId}</div>
                          </div>
                          <div className="dash-action-btns">
                            <button className="dash-action-btn" onClick={() => handleStartChat(friend.userId)} title="채팅">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            </button>
                            <button className="dash-action-btn" onClick={() => setMessageTarget({ userId: friend.userId, name: friend.name })} title="쪽지">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {friendTab === 'requests' && (
                <div className="dash-friend-requests-tab">
                  {pendingRequests.length > 0 && (
                    <div className="dash-friend-req-section">
                      <div className="dash-friend-req-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        받은 요청 <span className="dash-friend-req-count">{pendingRequests.length}</span>
                      </div>
                      {pendingRequests.map(req => {
                        const isOnline = classmates.some(c => c.userId === req.userId);
                        return (
                        <div key={req.friendshipId} className="dash-friend-request-item">
                          <div className="dash-user-avatar-wrap">
                            <div className="dash-user-avatar-sm" onClick={() => handleOpenProfile(req.userId)} style={{ cursor: 'pointer', background: isOnline ? '#f59e0b' : '#e8e3dc', color: isOnline ? 'white' : '#8b7d6b' }}>{req.name[0]}</div>
                            {isOnline && <span className="dash-online-dot"></span>}
                          </div>
                          <div className="dash-friend-request-info" onClick={() => handleOpenProfile(req.userId)} style={{ cursor: 'pointer' }}>
                            <div className="dash-user-name">{req.name}</div>
                            <div className="dash-user-school">
                              {friendSchools[req.userId]?.split(', ').map((school, idx) => (
                                <div key={idx}>{school}</div>
                              )) || '@' + req.userId}
                            </div>
                          </div>
                          <div className="dash-friend-request-btns">
                            <button
                              className="dash-friend-accept-btn"
                              onClick={() => handleAcceptFriend(req.friendshipId, req.name)}
                            >
                              수락
                            </button>
                            <button
                              className="dash-friend-reject-btn"
                              onClick={() => handleRejectFriend(req.friendshipId)}
                            >
                              거절
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {sentRequests.length > 0 && (
                    <div className="dash-friend-req-section">
                      <div className="dash-friend-req-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
                        보낸 요청 <span className="dash-friend-req-count">{sentRequests.length}</span>
                      </div>
                      {sentRequests.map(req => {
                        const isOnline = classmates.some(c => c.userId === req.userId);
                        return (
                        <div key={req.friendshipId} className="dash-friend-request-item">
                          <div className="dash-user-avatar-wrap">
                            <div className="dash-user-avatar-sm" onClick={() => handleOpenProfile(req.userId)} style={{ cursor: 'pointer', background: isOnline ? '#f59e0b' : '#e8e3dc', color: isOnline ? 'white' : '#8b7d6b' }}>{req.name[0]}</div>
                            {isOnline && <span className="dash-online-dot"></span>}
                          </div>
                          <div className="dash-friend-request-info" onClick={() => handleOpenProfile(req.userId)} style={{ cursor: 'pointer' }}>
                            <div className="dash-user-name">{req.name}</div>
                            <div className="dash-user-school">
                              {friendSchools[req.userId]?.split(', ').map((school, idx) => (
                                <div key={idx}>{school}</div>
                              )) || '@' + req.userId}
                            </div>
                          </div>
                          <div className="dash-friend-request-btns">
                            <button
                              className="dash-friend-cancel-btn"
                              onClick={() => handleCancelSentRequest(req.friendshipId, req.name)}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {pendingRequests.length === 0 && sentRequests.length === 0 && (
                    <div className="dash-friend-empty">친구 요청이 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          </aside>}
        </div>
      </div>

      {/* 프로필 모달 */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSendMessage={() => {
            setMessageTarget({ userId: selectedProfile.userId, name: selectedProfile.name });
            setSelectedProfile(null);
          }}
        />
      )}

      {/* 쪽지 보내기 */}
      {messageTarget && (
        <ComposeMessageModal
          recipientId={messageTarget.userId}
          recipientName={messageTarget.name}
          onClose={() => setMessageTarget(null)}
          onSent={() => {
            window.dispatchEvent(new Event('messageSent'));
          }}
        />
      )}

      {/* 친구 요청 확인 다이얼로그 */}
      {friendConfirmTarget && (
        <div className="dash-message-overlay" onClick={() => setFriendConfirmTarget(null)}>
          <div className="dash-message-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-message-modal-header">
              <h3>친구 추가</h3>
              <button onClick={() => setFriendConfirmTarget(null)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg></button>
            </div>
            <p style={{ padding: '16px 0', fontSize: '15px', textAlign: 'center' }}>
              <strong>{friendConfirmTarget.name}</strong>님에게 친구 신청하시겠습니까?
            </p>
            <div className="dash-message-modal-footer">
              <button className="dash-message-cancel-btn" onClick={() => setFriendConfirmTarget(null)}>
                취소
              </button>
              <button className="dash-message-send-btn" onClick={handleConfirmAddFriend}>
                신청
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 성공/실패 알림 */}
      {confirmationMessage && (
        <ConfirmationModal
          message={confirmationMessage}
          onConfirm={() => setConfirmationMessage(null)}
        />
      )}
    </div>
  );
}
