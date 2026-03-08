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
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native';
import { Colors } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { postAPI, PostResponse, CommentResponse } from '../api/post';
import { userAPI, ProfileResponse, SchoolInfo } from '../api/user';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import HeaderActions from '../components/HeaderActions';

type FilterType = 'all' | 'myGrade' | 'myClass';

const FILTER_LABELS: Record<FilterType, string> = {
  all: '전체글',
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [selectedClasses, setSelectedClasses] = useState<{ grade: string; classNumber: string }[]>([]);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(true);

  // 댓글 모달
  const [commentPostId, setCommentPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);

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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts(false);
  }, [fetchPosts]);

  const handleToggleLike = useCallback(async (postId: number) => {
    if (!user?.userId) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
          : p,
      ),
    );

    try {
      await postAPI.toggleLike(postId, user.userId);
    } catch {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
            : p,
        ),
      );
    }
  }, [user?.userId]);

  // ---- 댓글 ----
  const openComments = useCallback(async (postId: number) => {
    setCommentPostId(postId);
    setCommentText('');
    setReplyTo(null);
    setCommentsLoading(true);
    try {
      const data = await postAPI.getComments(postId, user?.userId);
      setComments(data);
    } catch {} finally {
      setCommentsLoading(false);
    }
  }, [user?.userId]);

  const handleSendComment = useCallback(async () => {
    if (!user?.userId || !commentPostId || !commentText.trim()) return;
    setCommentSending(true);
    try {
      await postAPI.addComment(commentPostId, user.userId, commentText.trim(), replyTo?.id);
      setCommentText('');
      setReplyTo(null);
      // 댓글 다시 로드
      const data = await postAPI.getComments(commentPostId, user.userId);
      setComments(data);
      // 게시글 댓글 수 업데이트
      setPosts(prev => prev.map(p => p.id === commentPostId ? { ...p, commentCount: data.length } : p));
    } catch {
      Alert.alert('오류', '댓글 작성에 실패했습니다');
    } finally {
      setCommentSending(false);
    }
  }, [user?.userId, commentPostId, commentText, replyTo]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!user?.userId || !commentPostId) return;
    Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
      { text: '취소' },
      {
        text: '삭제', style: 'destructive', onPress: async () => {
          try {
            await postAPI.deleteComment(commentId, user.userId);
            const data = await postAPI.getComments(commentPostId, user.userId);
            setComments(data);
            setPosts(prev => prev.map(p => p.id === commentPostId ? { ...p, commentCount: data.length } : p));
          } catch {}
        },
      },
    ]);
  }, [user?.userId, commentPostId]);

  const handleFilterChange = useCallback((key: FilterType) => {
    setFilter(key);
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

  const renderPostImages = (imageUrls: string[]) => {
    if (imageUrls.length === 0) return null;

    if (imageUrls.length === 1) {
      return (
        <Image source={{ uri: imageUrls[0] }} style={styles.singleImage} resizeMode="cover" />
      );
    }

    return (
      <FlatList
        data={imageUrls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
        )}
        style={styles.imageCarousel}
      />
    );
  };

  const renderPostCard = ({ item }: { item: PostResponse }) => (
    <View style={styles.postCard}>
      {/* Author header */}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.authorRow} activeOpacity={0.7}>
          <Avatar
            uri={item.author.profileImageUrl}
            name={item.author.name}
            size={40}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{item.author.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.schoolLabel}>
                {item.author.schoolName} {item.author.graduationYear}
              </Text>
              <Text style={styles.dot}> · </Text>
              <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {item.visibility && item.visibility !== 'SCHOOL' && (
          <View style={styles.visibilityBadge}>
            <Ionicons
              name={item.visibility === 'CLASS' ? 'people' : 'school'}
              size={12}
              color={Colors.primary}
            />
            <Text style={styles.visibilityText}>
              {item.visibility === 'CLASS'
                ? (item.targetGrade && item.targetClassNumber
                    ? `${item.targetGrade}학년 ${item.targetClassNumber}반`
                    : '우리반')
                : '우리학년'}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <Text style={styles.postContent} numberOfLines={5}>
        {item.content}
      </Text>

      {/* Images */}
      {item.imageUrls && item.imageUrls.length > 0 && renderPostImages(item.imageUrls)}

      {/* Stats bar */}
      <View style={styles.statsBar}>
        {item.likeCount > 0 && (
          <Text style={styles.statText}>
            <Ionicons name="heart" size={12} color={Colors.red} /> {item.likeCount}
          </Text>
        )}
        {item.commentCount > 0 && (
          <Text style={styles.statText}>
            댓글 {item.commentCount}개
          </Text>
        )}
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleLike(item.id)}
          activeOpacity={0.6}
        >
          <Ionicons
            name={item.liked ? 'heart' : 'heart-outline'}
            size={20}
            color={item.liked ? Colors.red : Colors.gray500}
          />
          <Text style={[styles.actionText, item.liked && styles.actionTextLiked]}>
            좋아요
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openComments(item.id)}
          activeOpacity={0.6}
        >
          <Ionicons name="chatbubble-outline" size={18} color={Colors.gray500} />
          <Text style={styles.actionText}>댓글</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {routeSchool && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: '600' }}>우리학교</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.schoolInfo}>
          {primarySchool?.schoolName || '학교'} {primarySchool?.graduationYear ? `(${primarySchool.graduationYear})` : ''}
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
            icon="⚠️"
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
            icon="📝"
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
        })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* 댓글 모달 */}
      <Modal visible={commentPostId !== null} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.commentModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.commentModalContent}>
            {/* 헤더 */}
            <View style={styles.commentModalHeader}>
              <Text style={styles.commentModalTitle}>댓글</Text>
              <TouchableOpacity onPress={() => { setCommentPostId(null); setReplyTo(null); }}>
                <Ionicons name="close" size={24} color={Colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* 댓글 목록 */}
            {commentsLoading ? (
              <ActivityIndicator style={{ marginVertical: 30 }} size="large" color={Colors.primary} />
            ) : comments.length === 0 ? (
              <View style={styles.commentEmpty}>
                <Text style={styles.commentEmptyText}>아직 댓글이 없습니다</Text>
                <Text style={styles.commentEmptySubText}>첫 댓글을 남겨보세요!</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={item => String(item.id)}
                style={styles.commentList}
                renderItem={({ item: c }) => (
                  <View>
                    {/* 댓글 */}
                    <View style={styles.commentRow}>
                      <Avatar uri={c.author.profileImageUrl} name={c.author.name} size={32} />
                      <View style={styles.commentBody}>
                        <Text style={styles.commentAuthor}>{c.author.name}</Text>
                        <Text style={styles.commentContent}>{c.content}</Text>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentTime}>{formatTimeAgo(c.createdAt)}</Text>
                          <TouchableOpacity onPress={() => setReplyTo({ id: c.id, name: c.author.name })}>
                            <Text style={styles.commentReplyBtn}>답글</Text>
                          </TouchableOpacity>
                          {c.canDelete && (
                            <TouchableOpacity onPress={() => handleDeleteComment(c.id)}>
                              <Text style={styles.commentDeleteBtn}>삭제</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                    {/* 대댓글 */}
                    {c.replies?.map(r => (
                      <View key={r.id} style={[styles.commentRow, styles.commentReply]}>
                        <Avatar uri={r.author.profileImageUrl} name={r.author.name} size={26} />
                        <View style={styles.commentBody}>
                          <Text style={styles.commentAuthor}>{r.author.name}</Text>
                          <Text style={styles.commentContent}>{r.content}</Text>
                          <View style={styles.commentMeta}>
                            <Text style={styles.commentTime}>{formatTimeAgo(r.createdAt)}</Text>
                            {r.canDelete && (
                              <TouchableOpacity onPress={() => handleDeleteComment(r.id)}>
                                <Text style={styles.commentDeleteBtn}>삭제</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              />
            )}

            {/* 답글 표시 */}
            {replyTo && (
              <View style={styles.replyToBar}>
                <Text style={styles.replyToText}>{replyTo.name}님에게 답글</Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close-circle" size={18} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
            )}

            {/* 입력 */}
            <View style={styles.commentInputBar}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyTo ? `${replyTo.name}님에게 답글...` : '댓글을 입력하세요...'}
                placeholderTextColor={Colors.gray400}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!commentText.trim() || commentSending) && { opacity: 0.4 }]}
                onPress={handleSendComment}
                disabled={!commentText.trim() || commentSending}
              >
                {commentSending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="send" size={18} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
    backgroundColor: Colors.white,
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
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  classChipContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  classChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  classChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray500,
  },
  classChipTextActive: {
    color: Colors.primary,
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
  postCard: {
    backgroundColor: Colors.white,
    paddingVertical: 14,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  schoolLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dot: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  singleImage: {
    width: '100%',
    height: 240,
    backgroundColor: Colors.gray100,
  },
  imageCarousel: {
    marginBottom: 4,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 240,
    backgroundColor: Colors.gray100,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginHorizontal: 16,
    paddingTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
  },
  actionTextLiked: {
    color: Colors.red,
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
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  // Comment modal styles
  commentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  commentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  commentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  commentEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  commentEmptySubText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  commentList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  commentReplyBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  commentDeleteBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.red,
  },
  commentReply: {
    marginLeft: 36,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    paddingLeft: 10,
  },
  replyToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
  },
  replyToText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
