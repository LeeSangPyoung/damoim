import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { userAPI, ClassmateInfo, UserSearchParams } from '../api/user';
import { friendAPI, FriendResponse, FriendshipStatus } from '../api/friend';
import { chatAPI } from '../api/chat';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useRoute } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import HeaderActions from '../components/HeaderActions';
import NoticeBanner from '../components/NoticeBanner';

type MainTab = 'friends' | 'search';
type SubTab = 'online' | 'myFriends' | 'requests';

export default function ClassmateFriendsScreen({ navigation }: any) {
  const { user } = useAuth();
  const route = useRoute<any>();
  const initialTab = route.params?.initialTab as MainTab | undefined;
  const autoSearch = route.params?.autoSearch as boolean | undefined;
  const [mainTab, setMainTab] = useState<MainTab>(initialTab || 'friends');
  const [subTab, setSubTab] = useState<SubTab>('online');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Online classmates
  const [onlineClassmates, setOnlineClassmates] = useState<ClassmateInfo[]>([]);
  const [allClassmates, setAllClassmates] = useState<ClassmateInfo[]>([]);

  // Friends
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [friendOnlineMap, setFriendOnlineMap] = useState<Record<string, boolean>>({});

  // Requests
  const [pendingRequests, setPendingRequests] = useState<FriendResponse[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendResponse[]>([]);

  // Friend status for classmates
  const [friendStatusMap, setFriendStatusMap] = useState<Record<string, FriendshipStatus>>({});

  // Sub-search within friends tab
  const [filterText, setFilterText] = useState('');

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Search tab state ----
  const [searchName, setSearchName] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchResults, setSearchResults] = useState<ClassmateInfo[]>([]);
  const [searchFriendStatuses, setSearchFriendStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // ==========================================================================
  // Data loading (friends tab)
  // ==========================================================================

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [profile, fr, pr, sr] = await Promise.all([
        userAPI.getProfile(user.userId),
        friendAPI.getMyFriends(user.userId),
        friendAPI.getPendingRequests(user.userId),
        friendAPI.getSentRequests(user.userId),
      ]);
      setFriends(fr);
      setPendingRequests(pr);
      setSentRequests(sr);

      const allCm: ClassmateInfo[] = [];
      const seen = new Set<string>();
      for (const school of profile.schools) {
        if (school.schoolCode && school.schoolType !== '대학교') {
          try {
            const res = await userAPI.searchClassmates(user.userId, school.schoolCode, school.graduationYear);
            for (const c of res.classmates) {
              if (!seen.has(c.userId)) { seen.add(c.userId); allCm.push(c); }
            }
          } catch {}
        }
      }
      setAllClassmates(allCm);
      setOnlineClassmates(allCm.filter(c => c.online));

      // 친구 온라인 상태
      const onlineMap: Record<string, boolean> = {};
      await Promise.all(
        fr.slice(0, 30).map(async (f) => {
          try {
            const p = await userAPI.getProfile(f.userId);
            onlineMap[f.userId] = !!p.online;
          } catch { onlineMap[f.userId] = false; }
        })
      );
      setFriendOnlineMap(onlineMap);

      // 동창에 대한 친구 상태
      const cmIds = allCm.map(c => c.userId);
      if (cmIds.length > 0) {
        try {
          const statuses = await friendAPI.getStatuses(user.userId, cmIds);
          setFriendStatusMap(statuses);
        } catch {}
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      if (user) loadData();
    }, 10000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [user, loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ==========================================================================
  // Actions
  // ==========================================================================

  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    try {
      await friendAPI.sendRequest(user.userId, targetUserId);
      Alert.alert('완료', '친구 요청을 보냈습니다');
      loadData();
    } catch { Alert.alert('실패', '친구 요청에 실패했습니다'); }
  };

  const handleAcceptRequest = async (friendshipId: number) => {
    if (!user) return;
    try {
      await friendAPI.acceptRequest(friendshipId, user.userId);
      loadData();
    } catch { Alert.alert('실패', '수락에 실패했습니다'); }
  };

  const handleRejectRequest = async (friendshipId: number) => {
    if (!user) return;
    try { await friendAPI.removeFriendship(friendshipId, user.userId); loadData(); } catch {}
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!user) return;
    try {
      const { roomId } = await chatAPI.createOrGetRoom(user.userId, targetUserId);
      navigation.navigate('Chat', { screen: 'ChatHome', params: { openRoomId: roomId } });
    } catch { Alert.alert('실패', '채팅방 생성에 실패했습니다'); }
  };

  const handleSendMessage = (targetUserId: string, targetName: string) => {
    navigation.navigate('Messages', { composeToId: targetUserId, composeToName: targetName });
  };

  const handleViewProfile = (targetUserId: string) => {
    navigation.navigate('Profile', { userId: targetUserId });
  };

  // ==========================================================================
  // Search tab actions
  // ==========================================================================

  const handleSearch = async () => {
    if (!user) return;
    // 아무 조건 없이도 전체 검색 허용
    setSearchLoading(true);
    setSearched(true);
    try {
      const params: UserSearchParams = {
        currentUserId: user.userId,
        name: searchName.trim() || undefined,
        schoolName: searchSchool.trim() || undefined,
        graduationYear: searchYear.trim() || undefined,
      };
      console.log('[동창검색] 검색 파라미터:', JSON.stringify(params));
      const response = await userAPI.searchUsers(params);
      console.log('[동창검색] 검색 결과:', response.classmates.length, '명');
      setSearchResults(response.classmates);

      if (response.classmates.length > 0) {
        const targetIds = response.classmates.map(c => c.userId);
        const statuses = await friendAPI.getStatuses(user.userId, targetIds);
        setSearchFriendStatuses(statuses);
      }
    } catch (e: any) {
      console.error('[동창검색] 에러:', e?.response?.status, e?.response?.data, e?.message);
      Alert.alert('오류', e?.response?.data?.error || e?.message || '검색에 실패했습니다');
    } finally {
      setSearchLoading(false);
    }
  };

  // 외부에서 autoSearch 파라미터로 진입 시 자동 전체 검색
  useEffect(() => {
    if (autoSearch && mainTab === 'search' && !searched && user) {
      handleSearch();
    }
  }, [autoSearch, mainTab, user]);

  const handleSearchReset = () => {
    setSearchName('');
    setSearchSchool('');
    setSearchYear('');
    setSearchResults([]);
    setSearchFriendStatuses({});
    setSearched(false);
  };

  const handleSearchFriendAction = async (targetUserId: string, targetName: string) => {
    if (!user) return;
    const status = searchFriendStatuses[targetUserId];
    try {
      if (!status || status.status === 'NONE') {
        await friendAPI.sendRequest(user.userId, targetUserId);
        setSearchFriendStatuses(prev => ({
          ...prev, [targetUserId]: { status: 'SENT', friendshipId: 0 },
        }));
        Alert.alert('완료', `${targetName}님에게 친구 요청을 보냈습니다`);
      } else if (status.status === 'RECEIVED' && status.friendshipId) {
        await friendAPI.acceptRequest(status.friendshipId, user.userId);
        setSearchFriendStatuses(prev => ({
          ...prev, [targetUserId]: { status: 'FRIEND', friendshipId: status.friendshipId },
        }));
        Alert.alert('완료', `${targetName}님과 친구가 되었습니다`);
      }
    } catch (e: any) {
      Alert.alert('실패', e?.response?.data?.error || '처리 실패');
    }
  };

  // ==========================================================================
  // Filtered data
  // ==========================================================================

  const filteredClassmates = filterText
    ? allClassmates.filter(c => c.name.includes(filterText) || c.school?.schoolName?.includes(filterText))
    : (subTab === 'online' ? onlineClassmates : allClassmates);

  const onlineFriends = friends.filter(f => friendOnlineMap[f.userId]);

  // ==========================================================================
  // Render helpers
  // ==========================================================================

  const renderFriendStatusButton = (userId: string, statusMap: Record<string, FriendshipStatus>, onAction: (id: string, name: string) => void, name: string) => {
    const status = statusMap[userId];
    const isFriend = status?.status === 'FRIEND';
    const isSent = status?.status === 'SENT';
    const isReceived = status?.status === 'RECEIVED';

    if (isFriend) {
      return (
        <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleStartChat(userId)}>
          <Ionicons name="chatbox-outline" size={16} color="#2D5016" />
        </TouchableOpacity>
      );
    }
    if (isSent) {
      return (
        <View style={styles.actionBtnDisabled}>
          <Text style={styles.actionBtnDisabledText}>요청됨</Text>
        </View>
      );
    }
    if (isReceived) {
      return (
        <TouchableOpacity style={styles.acceptBtn} onPress={() => onAction(userId, name)}>
          <Text style={styles.acceptBtnText}>수락</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.actionBtnOutline} onPress={() => onAction(userId, name)}>
        <Ionicons name="person-add" size={16} color="#2D5016" />
      </TouchableOpacity>
    );
  };

  // ==========================================================================
  // Loading state
  // ==========================================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>동창/친구 정보를 불러오는 중...</Text>
      </View>
    );
  }

  // ==========================================================================
  // Main render
  // ==========================================================================

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="person-add" size={33} color="#fff" style={{ marginTop: -3 }} />
          <Text style={styles.screenHeaderTitle}>내동창친구</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>

      <NoticeBanner />

      {/* Main Tabs */}
      <View style={styles.mainTabBar}>
        {([
          { key: 'friends' as MainTab, label: '내동창친구' },
          { key: 'search' as MainTab, label: '동창검색' },
        ]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.mainTab, mainTab === t.key && styles.mainTabActive]}
            onPress={() => setMainTab(t.key)}
          >
            <Text style={[styles.mainTabText, mainTab === t.key && styles.mainTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ================================================================= */}
      {/* 내동창친구 Tab */}
      {/* ================================================================= */}
      {mainTab === 'friends' && (
        <>
          {/* Sub Tabs */}
          <View style={styles.subTabBar}>
            {([
              { key: 'online' as SubTab, label: '접속중', count: onlineClassmates.length },
              { key: 'myFriends' as SubTab, label: '내 친구', count: friends.length },
              { key: 'requests' as SubTab, label: '요청', count: pendingRequests.length + sentRequests.length },
            ]).map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.subTabItem, subTab === t.key && styles.subTabItemActive]}
                onPress={() => setSubTab(t.key)}
              >
                <Text style={[styles.subTabText, subTab === t.key && styles.subTabTextActive]}>
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View style={[styles.tabCount, subTab === t.key && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, subTab === t.key && styles.tabCountTextActive]}>
                      {t.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Filter (for online/myFriends) */}
          {subTab !== 'requests' && (
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={Colors.gray400} />
              <TextInput
                style={styles.searchInput}
                placeholder="이름 또는 학교로 검색..."
                placeholderTextColor={Colors.gray400}
                value={filterText}
                onChangeText={setFilterText}
              />
              {filterText.length > 0 && (
                <TouchableOpacity onPress={() => setFilterText('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {/* 접속중 */}
            {subTab === 'online' && (
              <>
                {filteredClassmates.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="wifi-outline" size={40} color={Colors.gray300} />
                    <Text style={styles.emptyText}>
                      {filterText ? '검색 결과가 없습니다' : '현재 접속 중인 동창이 없습니다'}
                    </Text>
                  </View>
                ) : (
                  filteredClassmates.map(cm => {
                    const status = friendStatusMap[cm.userId];
                    const isFriend = status?.status === 'FRIEND';
                    const isSent = status?.status === 'SENT';
                    return (
                      <View key={cm.userId} style={styles.personRow}>
                        <View style={styles.avatarWrap}>
                          <Avatar uri={cm.profileImageUrl} name={cm.name} size={44} />
                          {cm.online && <View style={styles.onlineDot} />}
                        </View>
                        <TouchableOpacity style={styles.personInfo} activeOpacity={0.6} onPress={() => handleViewProfile(cm.userId)}>
                          <Text style={styles.personName}>{cm.name}</Text>
                          <Text style={styles.personSchool} numberOfLines={1}>
                            {cm.school?.schoolName} {cm.school?.graduationYear && `(${cm.school.graduationYear})`}
                            {cm.school?.grade && ` ${cm.school.grade}학년`}
                            {cm.school?.classNumber && ` ${cm.school.classNumber}반`}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.personActions}>
                          {isFriend ? (
                            <>
                              <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleSendMessage(cm.userId, cm.name)}>
                                <Ionicons name="mail-outline" size={16} color="#2D5016" />
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleStartChat(cm.userId)}>
                                <Ionicons name="chatbox-outline" size={16} color="#2D5016" />
                              </TouchableOpacity>
                            </>
                          ) : isSent ? (
                            <View style={styles.actionBtnDisabled}>
                              <Text style={styles.actionBtnDisabledText}>요청됨</Text>
                            </View>
                          ) : (
                            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleSendFriendRequest(cm.userId)}>
                              <Ionicons name="person-add" size={16} color="#2D5016" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </>
            )}

            {/* 내 친구 */}
            {subTab === 'myFriends' && (
              <>
                {onlineFriends.length > 0 && (
                  <>
                    <View style={styles.subSectionHeader}>
                      <View style={styles.onlineDotSmall} />
                      <Text style={styles.subSectionTitle}>접속 중 ({onlineFriends.length})</Text>
                    </View>
                    {onlineFriends
                      .filter(f => !filterText || f.name.includes(filterText))
                      .map(friend => (
                      <View key={friend.friendshipId} style={styles.personRow}>
                        <View style={styles.avatarWrap}>
                          <Avatar uri={friend.profileImageUrl} name={friend.name} size={44} />
                          <View style={styles.onlineDot} />
                        </View>
                        <TouchableOpacity style={styles.personInfo} activeOpacity={0.6} onPress={() => handleViewProfile(friend.userId)}>
                          <Text style={styles.personName}>{friend.name}</Text>
                          <Text style={[styles.personSchool, { color: '#22c55e' }]}>접속 중</Text>
                        </TouchableOpacity>
                        <View style={styles.personActions}>
                          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleSendMessage(friend.userId, friend.name)}>
                            <Ionicons name="mail-outline" size={16} color="#2D5016" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleStartChat(friend.userId)}>
                            <Ionicons name="chatbox-outline" size={16} color="#2D5016" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                <View style={styles.subSectionHeader}>
                  <Text style={styles.subSectionTitle}>
                    {onlineFriends.length > 0 ? '오프라인' : '전체'} ({friends.length - onlineFriends.length})
                  </Text>
                </View>
                {friends
                  .filter(f => !friendOnlineMap[f.userId])
                  .filter(f => !filterText || f.name.includes(filterText))
                  .map(friend => (
                  <View key={friend.friendshipId} style={styles.personRow}>
                    <View style={styles.avatarWrap}>
                      <Avatar uri={friend.profileImageUrl} name={friend.name} size={44} />
                    </View>
                    <TouchableOpacity style={styles.personInfo} activeOpacity={0.6} onPress={() => handleViewProfile(friend.userId)}>
                      <Text style={styles.personName}>{friend.name}</Text>
                      <Text style={styles.personSchool}>오프라인</Text>
                    </TouchableOpacity>
                    <View style={styles.personActions}>
                      <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleSendMessage(friend.userId, friend.name)}>
                        <Ionicons name="mail-outline" size={16} color="#2D5016" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, { backgroundColor: Colors.gray200 }]}
                        onPress={() => handleStartChat(friend.userId)}
                      >
                        <Ionicons name="chatbox-outline" size={14} color={Colors.gray500} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {friends.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Ionicons name="people-outline" size={40} color={Colors.gray300} />
                    <Text style={styles.emptyText}>아직 친구가 없습니다</Text>
                    <Text style={styles.emptySubText}>접속중 탭에서 동창에게 친구 요청을 보내보세요</Text>
                  </View>
                )}
              </>
            )}

            {/* 요청 */}
            {subTab === 'requests' && (
              <>
                <View style={styles.subSectionHeader}>
                  <Text style={styles.subSectionTitle}>받은 요청 ({pendingRequests.length})</Text>
                </View>
                {pendingRequests.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>받은 친구 요청이 없습니다</Text>
                  </View>
                ) : (
                  pendingRequests.map(req => (
                    <View key={req.friendshipId} style={styles.personRow}>
                      <View style={styles.avatarWrap}>
                        <Avatar uri={req.profileImageUrl} name={req.name} size={44} />
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={styles.personName}>{req.name}</Text>
                        <Text style={styles.personSchool}>친구 요청</Text>
                      </View>
                      <View style={styles.requestActions}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req.friendshipId)}>
                          <Text style={styles.acceptBtnText}>수락</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(req.friendshipId)}>
                          <Text style={styles.rejectBtnText}>거절</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                <View style={styles.subSectionHeader}>
                  <Text style={styles.subSectionTitle}>보낸 요청 ({sentRequests.length})</Text>
                </View>
                {sentRequests.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>보낸 친구 요청이 없습니다</Text>
                  </View>
                ) : (
                  sentRequests.map(req => (
                    <View key={req.friendshipId} style={styles.personRow}>
                      <View style={styles.avatarWrap}>
                        <Avatar uri={req.profileImageUrl} name={req.name} size={44} />
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={styles.personName}>{req.name}</Text>
                        <Text style={styles.personSchool}>대기 중</Text>
                      </View>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => handleRejectRequest(req.friendshipId)}>
                        <Text style={styles.cancelBtnText}>취소</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </>
      )}

      {/* ================================================================= */}
      {/* 동창검색 Tab */}
      {/* ================================================================= */}
      {mainTab === 'search' && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Search form */}
          <View style={styles.searchForm}>
            <TextInput
              style={styles.searchFormInput}
              placeholder="이름으로 검색"
              placeholderTextColor={Colors.gray400}
              value={searchName}
              onChangeText={setSearchName}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <View style={styles.searchFormRow}>
              <TextInput
                style={[styles.searchFormInput, { flex: 1 }]}
                placeholder="학교명 (예: 중마초등학교)"
                placeholderTextColor={Colors.gray400}
                value={searchSchool}
                onChangeText={setSearchSchool}
              />
              <TextInput
                style={[styles.searchFormInput, { width: 110 }]}
                placeholder="졸업년도"
                placeholderTextColor={Colors.gray400}
                value={searchYear}
                onChangeText={setSearchYear}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.searchFormButtons}>
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={styles.searchBtnText}>검색하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={handleSearchReset}>
                <Ionicons name="refresh" size={16} color={Colors.gray600} />
                <Text style={styles.resetBtnText}>초기화</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search results */}
          {searchLoading && (
            <ActivityIndicator style={{ marginTop: 30 }} size="large" color={Colors.primary} />
          )}

          {!searchLoading && searched && (
            <View style={styles.searchResultsSection}>
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsTitle}>검색 결과</Text>
                <Text style={styles.searchResultsCount}>{searchResults.length}명</Text>
              </View>

              {searchResults.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
                  <Text style={styles.emptySubText}>다른 검색 조건으로 시도해보세요</Text>
                </View>
              ) : (
                searchResults.map(cm => {
                  const status = searchFriendStatuses[cm.userId];
                  const isFriend = status?.status === 'FRIEND';
                  const isSent = status?.status === 'SENT';
                  const isReceived = status?.status === 'RECEIVED';
                  return (
                    <View key={cm.userId} style={styles.personRow}>
                      <View style={styles.avatarWrap}>
                        <Avatar uri={cm.profileImageUrl} name={cm.name} size={44} />
                        {cm.online && <View style={styles.onlineDot} />}
                      </View>
                      <TouchableOpacity style={styles.personInfo} activeOpacity={0.6} onPress={() => handleViewProfile(cm.userId)}>
                        <View style={styles.searchNameRow}>
                          <Text style={styles.personName}>{cm.name}</Text>
                          {isFriend && (
                            <View style={styles.friendBadge}>
                              <Ionicons name="checkmark" size={10} color="#fff" />
                              <Text style={styles.friendBadgeText}>친구</Text>
                            </View>
                          )}
                          {isSent && (
                            <View style={[styles.friendBadge, { backgroundColor: Colors.gray200 }]}>
                              <Text style={[styles.friendBadgeText, { color: Colors.gray600 }]}>요청됨</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.personSchool} numberOfLines={1}>
                          {cm.school?.schoolName} {cm.school?.graduationYear}
                          {cm.school?.grade && ` ${cm.school.grade}학년`}
                          {cm.school?.classNumber && ` ${cm.school.classNumber}반`}
                        </Text>
                        {cm.online ? (
                          <Text style={[styles.personSchool, { color: '#22c55e' }]}>접속중</Text>
                        ) : cm.lastActiveTime ? (
                          <Text style={styles.personSchool}>{cm.lastActiveTime}</Text>
                        ) : null}
                        {cm.bio ? <Text style={styles.personBio} numberOfLines={1}>{cm.bio}</Text> : null}
                      </TouchableOpacity>
                      <View style={styles.personActions}>
                        <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => handleSendMessage(cm.userId, cm.name)}>
                          <Ionicons name="mail-outline" size={16} color="#2D5016" />
                        </TouchableOpacity>
                        {isFriend ? (
                          <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleStartChat(cm.userId)}>
                            <Ionicons name="chatbox-outline" size={16} color="#2D5016" />
                          </TouchableOpacity>
                        ) : isReceived ? (
                          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleSearchFriendAction(cm.userId, cm.name)}>
                            <Text style={styles.acceptBtnText}>수락</Text>
                          </TouchableOpacity>
                        ) : isSent ? (
                          <View style={[styles.actionBtnOutline, { borderColor: Colors.gray300, backgroundColor: Colors.gray100 }]}>
                            <Ionicons name="hourglass-outline" size={14} color={Colors.gray400} />
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.actionBtnOutline} onPress={() => handleSearchFriendAction(cm.userId, cm.name)}>
                            <Ionicons name="person-add" size={16} color="#2D5016" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {!searched && !searchLoading && (
            <View style={[styles.emptyCard, { marginTop: 20 }]}>
              <Ionicons name="search" size={40} color={Colors.gray300} />
              <Text style={styles.emptyText}>이름, 학교명, 졸업년도로 동창을 검색하세요</Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E7' },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textSecondary, fontFamily: Fonts.regular },

  // Screen header
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingTop: HEADER_TOP_PADDING,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#C49A2A',
  },
  screenHeaderTitle: { fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold, letterSpacing: 2 },

  // Main tabs (동창이네 스타일)
  mainTabBar: {
    flexDirection: 'row', backgroundColor: '#FFF8E7',
    borderBottomWidth: 1, borderBottomColor: '#F0E0B0',
  },
  mainTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  mainTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  mainTabText: { fontSize: 14, fontWeight: '600', color: Colors.gray400, fontFamily: Fonts.bold },
  mainTabTextActive: { color: Colors.primary },

  // Stats bar
  statsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#FFF8E7',
    borderBottomWidth: 1, borderBottomColor: '#F0E0B0',
  },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  onlineDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  onlineBadgeText: { fontSize: 11, fontWeight: '600', color: '#2D5016' },
  headerStatText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  requestBadge: {
    backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  requestBadgeText: { fontSize: 11, fontWeight: '600', color: '#FF6B6B' },

  // Sub tabs
  subTabBar: {
    flexDirection: 'row', backgroundColor: '#FFF8E7',
    borderBottomWidth: 1, borderBottomColor: '#F0E0B0', paddingHorizontal: 16,
  },
  subTabItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  subTabItemActive: { borderBottomColor: Colors.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, fontFamily: Fonts.bold },
  subTabTextActive: { color: Colors.primary },
  tabCount: {
    backgroundColor: Colors.gray200, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8,
  },
  tabCountActive: { backgroundColor: Colors.primary + '20' },
  tabCountText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  tabCountTextActive: { color: Colors.primary },

  // Search filter bar (within friends tab)
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: '#FFF8E7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },

  scrollView: { flex: 1 },

  // Search form (동창검색 tab)
  searchForm: {
    margin: 16, padding: 16, backgroundColor: '#ffffff', borderRadius: 12, gap: 10,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  searchFormRow: { flexDirection: 'row', gap: 10 },
  searchFormInput: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 8,
    padding: 10, fontSize: 14, backgroundColor: Colors.gray50, color: Colors.text,
  },
  searchFormButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  searchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 12,
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: Fonts.bold },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.gray100, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16,
  },
  resetBtnText: { color: Colors.gray600, fontSize: 14, fontWeight: '600' },

  // Search results
  searchResultsSection: { paddingHorizontal: 16 },
  searchResultsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  searchResultsTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, fontFamily: Fonts.bold },
  searchResultsCount: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  searchNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  friendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  friendBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  personBio: { fontSize: 12, color: Colors.gray400, marginTop: 2 },

  // Sub section
  subSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  subSectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // Person row
  personRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 12,
    padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  avatarWrap: { position: 'relative' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff',
  },
  personInfo: { flex: 1, gap: 2 },
  personName: { fontSize: 15, fontWeight: '600', color: Colors.text, fontFamily: Fonts.bold },
  personSchool: { fontSize: 12, color: Colors.textSecondary },
  personActions: { flexDirection: 'row', gap: 8 },

  // Action buttons
  actionBtnPrimary: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF8E7', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#F0E0B0',
  },
  actionBtnSecondary: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF8E7', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#F0E0B0',
  },
  actionBtnOutline: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF8E7', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#F0E0B0',
  },
  actionBtnDisabled: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    backgroundColor: Colors.gray100,
  },
  actionBtnDisabledText: { fontSize: 11, color: Colors.gray400, fontWeight: '500' },

  // Request actions
  requestActions: { flexDirection: 'row', gap: 6 },
  acceptBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  rejectBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.gray100,
  },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  cancelBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#FF6B6B' },

  // Empty
  emptyCard: {
    marginHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 12,
    padding: 32, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500', fontFamily: Fonts.regular },
  emptySubText: { fontSize: 12, color: Colors.gray400 },
});
