import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { postAPI, PostResponse } from '../api/post';
import { userAPI, ProfileResponse, SchoolInfo } from '../api/user';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import LinkedText from '../components/LinkedText';
import HeaderActions from '../components/HeaderActions';

type FilterType = 'all' | 'myGrade' | 'myClass';

const FILTER_LABELS: Record<FilterType, string> = {
  all: '우리학교',
  myGrade: '우리학년',
  myClass: '우리반',
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR');
}


export default function DashboardScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [filter, setFilter] = useState<FilterType>(route?.params?.tab === 'myClass' ? 'myClass' : 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 우리반 필터: 프로필에 등록된 학년/반 목록
  const [gradeClasses, setGradeClasses] = useState<{ grade: string; classNumber?: string }[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<{ grade: string; classNumber: string }[]>(
    route?.params?.grade && route?.params?.classNumber
      ? [{ grade: route.params.grade, classNumber: route.params.classNumber }]
      : []
  );
  const [isAllSelected, setIsAllSelected] = useState<boolean>(
    !(route?.params?.grade && route?.params?.classNumber)
  );

  // 탭별 새 글 카운트
  const [newCounts, setNewCounts] = useState<Record<FilterType, number>>({ all: 0, myGrade: 0, myClass: 0 });

  // 게시글 메뉴 모달
  const [menuPost, setMenuPost] = useState<PostResponse | null>(null);

  // 댓글 모달 (상세 화면으로 이동됨 - 미사용 state 유지는 하지 않음)

  // route params에서 학교 정보를 받거나, 프로필의 첫 번째 학교 사용
  const routeSchool = route?.params?.schoolName ? {
    schoolName: route.params.schoolName,
    graduationYear: route.params.graduationYear,
    schoolCode: route.params.schoolCode,
  } : null;
  const primarySchool = routeSchool || profile?.schools?.[0];

  const fetchProfile = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const data = await userAPI.getProfile(user.userId);
      setProfile(data);

      // 프로필에서 해당 학교의 학년/반 데이터 로드
      if (primarySchool?.schoolName) {
        const matching = data.schools.filter(
          (s: SchoolInfo) => s.schoolName === primarySchool.schoolName && s.graduationYear === primarySchool.graduationYear
        );
        const gc = matching
          .filter((s: SchoolInfo) => s.grade)
          .map((s: SchoolInfo) => ({ grade: s.grade!, classNumber: s.classNumber }));
        setGradeClasses(gc);

        // route에서 grade/class 파라미터가 있으면 자동 필터링
        const routeGrade = route?.params?.grade;
        const routeClass = route?.params?.classNumber;
        if (routeGrade && routeClass) {
          setIsAllSelected(false);
          setSelectedClasses([{ grade: routeGrade, classNumber: routeClass }]);
        }
      }
    } catch {
      // Profile fetch failure is non-critical
    }
  }, [user?.userId, primarySchool?.schoolName, primarySchool?.graduationYear]);

  const fetchPosts = useCallback(async (showLoader = true) => {
    if (!user?.userId) return;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      let data: PostResponse[];
      if (filter === 'myClass' && !isAllSelected && selectedClasses.length === 1) {
        data = await postAPI.getPosts(
          user.userId, filter, primarySchool?.schoolName, primarySchool?.graduationYear,
          selectedClasses[0].grade, selectedClasses[0].classNumber,
        );
      } else if (filter === 'myClass' && !isAllSelected && selectedClasses.length > 1) {
        const results = await Promise.all(
          selectedClasses.map(sc =>
            postAPI.getPosts(user.userId, filter, primarySchool?.schoolName, primarySchool?.graduationYear, sc.grade, sc.classNumber)
          ),
        );
        const merged = results.flat();
        const seen = new Set<number>();
        data = merged.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        data = await postAPI.getPosts(user.userId, filter, primarySchool?.schoolName, primarySchool?.graduationYear);
      }
      setPosts(data);
    } catch (err: any) {
      setError('게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.userId, filter, primarySchool?.schoolName, primarySchool?.graduationYear, selectedClasses, isAllSelected]);

  const fetchNewCounts = useCallback(async () => {
    if (!user?.userId || !primarySchool?.schoolName) return;
    try {
      const counts = await postAPI.getNewCounts(
        user.userId, primarySchool.schoolName, primarySchool.graduationYear
      );
      setNewCounts(counts);
    } catch {}
  }, [user?.userId, primarySchool?.schoolName, primarySchool?.graduationYear]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchNewCounts();
  }, [fetchNewCounts]);

  // 화면이 다시 포커스되면 게시글 새로고침 (글 작성 후 돌아올 때)
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchPosts(false);
      fetchNewCounts();
    });
    return unsubscribe;
  }, [navigation, fetchPosts, fetchNewCounts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts(false);
  }, [fetchPosts]);

  const handleFilterChange = useCallback((key: FilterType) => {
    setFilter(key);
    // 해당 탭의 새 글 카운트 초기화
    setNewCounts(prev => ({ ...prev, [key]: 0 }));
    // 우리반 외 탭 선택 시 학년/반 필터 초기화
    if (key !== 'myClass') {
      setIsAllSelected(true);
      setSelectedClasses([]);
    }
  }, []);

  const handleClassChipToggle = useCallback((gc: { grade: string; classNumber?: string }) => {
    if (!gc.classNumber) return;
    const cls = { grade: gc.grade, classNumber: gc.classNumber };
    setSelectedClasses(prev => {
      const exists = prev.some(c => c.grade === cls.grade && c.classNumber === cls.classNumber);
      if (exists) {
        const next = prev.filter(c => !(c.grade === cls.grade && c.classNumber === cls.classNumber));
        if (next.length === 0) {
          setIsAllSelected(true);
        }
        return next;
      } else {
        setIsAllSelected(false);
        return [...prev, cls];
      }
    });
  }, []);

  const handleAllChipPress = useCallback(() => {
    setIsAllSelected(true);
    setSelectedClasses([]);
  }, []);

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {(Object.keys(FILTER_LABELS) as FilterType[]).map((key) => (
        <TouchableOpacity
          key={key}
          style={[styles.filterTab, filter === key && styles.filterTabActive]}
          onPress={() => handleFilterChange(key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterTabText, filter === key && styles.filterTabTextActive]}>
            {FILTER_LABELS[key]}
          </Text>
          {false && filter !== key && newCounts[key] > 0 && (
            <View style={styles.tabNewBadge}>
              <Text style={styles.tabNewBadgeText}>N</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderClassFilterChips = () => {
    if (filter !== 'myClass' || gradeClasses.length === 0) return null;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.classChipContainer}
        contentContainerStyle={styles.classChipContent}
      >
        <TouchableOpacity
          style={[styles.classChip, isAllSelected && styles.classChipActive]}
          onPress={handleAllChipPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.classChipText, isAllSelected && styles.classChipTextActive]}>
            전체
          </Text>
        </TouchableOpacity>
        {gradeClasses.map((gc, idx) => {
          const isSelected = !isAllSelected && selectedClasses.some(
            c => c.grade === gc.grade && c.classNumber === gc.classNumber
          );
          return (
            <TouchableOpacity
              key={`${gc.grade}-${gc.classNumber}-${idx}`}
              style={[styles.classChip, isSelected && styles.classChipActive]}
              onPress={() => handleClassChipToggle(gc)}
              activeOpacity={0.7}
            >
              <Text style={[styles.classChipText, isSelected && styles.classChipTextActive]}>
                {gc.grade}학년 {gc.classNumber}반
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const handleDeletePost = useCallback(async (postId: number) => {
    if (!user?.userId) return;
    setMenuPost(null);
    if (Platform.OS === 'web') {
      if (!window.confirm('이 게시글을 삭제하시겠습니까?')) return;
    }
    try {
      await postAPI.deletePost(postId, user.userId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch {
      Alert.alert('오류', '게시글 삭제에 실패했습니다.');
    }
  }, [user?.userId]);

  const handleEditPost = useCallback((item: PostResponse) => {
    setMenuPost(null);
    navigation?.navigate?.('EditPost', {
      postId: item.id,
      content: item.content,
      imageUrls: item.imageUrls || [],
      schoolName: primarySchool?.schoolName,
      graduationYear: primarySchool?.graduationYear,
    });
  }, [navigation, primarySchool]);

  const handleOpenDetail = useCallback((item: PostResponse) => {
    navigation?.navigate?.('PostDetail', {
      postId: item.id,
      schoolName: primarySchool?.schoolName,
      graduationYear: primarySchool?.graduationYear,
    });
  }, [navigation, primarySchool]);

  const renderPostCard = ({ item }: { item: PostResponse }) => {
    const isMyPost = item.author.userId === user?.userId;
    const hasImage = item.imageUrls && item.imageUrls.length > 0;
    return (
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.7}
        onPress={() => handleOpenDetail(item)}
      >
        <View style={styles.postCardRow}>
          {/* 왼쪽: 썸네일 */}
          {hasImage && (
            <Image
              source={{ uri: item.imageUrls![0] }}
              style={styles.postCardThumb}
              resizeMode="cover"
            />
          )}

          {/* 오른쪽: 텍스트 영역 */}
          <View style={styles.postCardLeft}>
            {/* Author line */}
            <View style={styles.postCardAuthorRow}>
              <Avatar
                uri={item.author.profileImageUrl}
                name={item.author.name}
                size={24}
              />
              <Text style={styles.postCardAuthorName}>{item.author.name}</Text>
              <Text style={styles.postCardTime}>{formatTimeAgo(item.createdAt)}</Text>
              {isMyPost && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); setMenuPost(item); }}
                  activeOpacity={0.6}
                  style={styles.postMenuBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color={Colors.gray400} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content preview */}
            <LinkedText style={styles.postCardContent}>{item.content}</LinkedText>

            {/* Stats */}
            <View style={styles.postCardStats}>
              {item.visibility && item.visibility !== 'SCHOOL' && (
                <View style={styles.postCardVisibility}>
                  <Ionicons
                    name={item.visibility === 'CLASS' ? 'people' : 'school'}
                    size={10}
                    color={Colors.primary}
                  />
                  <Text style={styles.postCardVisibilityText}>
                    {item.visibility === 'CLASS'
                      ? (item.targetGrade && item.targetClassNumber
                          ? `${item.targetGrade}-${item.targetClassNumber}반`
                          : '우리반')
                      : '우리학년'}
                  </Text>
                </View>
              )}
              {item.likeCount > 0 && (
                <View style={styles.postCardStatItem}>
                  <Ionicons name="heart" size={11} color={Colors.red} />
                  <Text style={styles.postCardStatText}>{item.likeCount}</Text>
                </View>
              )}
              {item.commentCount > 0 && (
                <View style={styles.postCardStatItem}>
                  <Ionicons name="chatbubble" size={10} color={Colors.gray400} />
                  <Text style={styles.postCardStatText}>{item.commentCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {routeSchool && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
          >
            <Ionicons name="chevron-back" size={18} color="#FFE156" />
            <Text style={{ fontSize: 13, color: '#FFE156', fontWeight: '600' }}>우리학교</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.schoolInfo}>
          {primarySchool?.schoolName || '학교'} {primarySchool?.graduationYear ? `(${primarySchool.graduationYear})` : ''}
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}> </Text>
        </Text>
      </View>
      <HeaderActions navigation={navigation} />
    </View>
  );

  const renderListHeader = () => (
    <View>
      {renderHeader()}
      {renderFilterTabs()}
      {renderClassFilterChips()}
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        {renderHeader()}
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>게시글을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        {renderHeader()}
        <View style={styles.loadingWrap}>
          <EmptyState
            ionIcon="alert-circle-outline"
            title={error}
            subtitle="아래로 당겨서 다시 시도해주세요."
          />
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchPosts()}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPostCard}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <EmptyState
            ionIcon="document-text-outline"
            title="아직 게시글이 없습니다"
            subtitle="첫 번째 게시글을 작성해보세요!"
          />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* FAB */}
      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation?.navigate?.('CreatePost', {
          schoolName: primarySchool?.schoolName,
          graduationYear: primarySchool?.graduationYear,
          currentFilter: filter,
          selectedClass: (!isAllSelected && selectedClasses.length === 1) ? selectedClasses[0] : undefined,
          gradeClasses,
        })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* 게시글 메뉴 모달 */}
      <Modal visible={menuPost !== null} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setMenuPost(null)}
        >
          <View style={styles.menuModalContent}>
            <Text style={styles.menuModalTitle}>게시글 관리</Text>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => menuPost && handleEditPost(menuPost)}
            >
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
              <Text style={styles.menuModalItemText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuModalItem}
              onPress={() => menuPost && handleDeletePost(menuPost.id)}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.red} />
              <Text style={[styles.menuModalItemText, { color: Colors.red }]}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuModalItem, { borderBottomWidth: 0 }]}
              onPress={() => setMenuPost(null)}
            >
              <Ionicons name="close-outline" size={20} color={Colors.gray500} />
              <Text style={[styles.menuModalItemText, { color: Colors.gray500 }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
    backgroundColor: '#2D5016',
    borderBottomWidth: 3,
    borderBottomColor: '#C49A2A',
  },
  headerLeft: {
    flex: 1,
  },
  headerAvatar: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  schoolInfo: {
    fontSize: 24,
    color: '#fff',
    marginTop: 2,
    fontFamily: Fonts.chalk,
    letterSpacing: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E0B0',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFF8E7',
  },
  filterTabActive: {
    backgroundColor: '#2D5016',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
    fontFamily: Fonts.bold,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  tabNewBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
    backgroundColor: Colors.red,
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabNewBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.white,
  },
  classChipContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E0B0',
    maxHeight: 48,
  },
  classChipContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0E0B0',
  },
  classChipActive: {
    backgroundColor: '#E8F0E0',
    borderColor: '#2D5016',
  },
  classChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8D6E63',
  },
  classChipTextActive: {
    color: '#2D5016',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  separator: {
    height: 8,
  },
  // 간략형 카드
  postCard: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E0B0',
  },
  postCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  postCardLeft: {
    flex: 1,
  },
  postCardAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  postCardAuthorName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  postCardTime: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  postMenuBtn: {
    padding: 4,
  },
  postCardContent: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    fontFamily: Fonts.regular,
    marginBottom: 6,
  },
  postCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postCardVisibility: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  postCardVisibilityText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  postCardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postCardStatText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  postCardThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2D5016',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D5016',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  // 게시글 메뉴 모달
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 260,
    overflow: 'hidden',
  },
  menuModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    fontFamily: Fonts.bold,
  },
  menuModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuModalItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
});
