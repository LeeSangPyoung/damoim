import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { postAPI, PostResponse, CommentResponse } from '../api/post';
import { reunionAPI, ReunionPostResponse, ReunionCommentResponse } from '../api/reunion';
import Avatar from '../components/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function PostDetailScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const postId: number = route?.params?.postId;
  const reunionPost: ReunionPostResponse | undefined = route?.params?.reunionPost;
  const isReunion = !!reunionPost;
  const [post, setPost] = useState<PostResponse | null>(null);
  const [loading, setLoading] = useState(!isReunion);

  // reunion 모드일 때 PostResponse 형태로 변환
  const displayPost: PostResponse | null = isReunion ? {
    id: reunionPost!.id,
    content: reunionPost!.content,
    imageUrls: reunionPost!.imageUrls || [],
    author: {
      userId: reunionPost!.authorUserId,
      name: reunionPost!.authorName,
      profileImageUrl: reunionPost!.authorProfileImageUrl,
      schoolName: '',
      graduationYear: '',
    },
    likeCount: reunionPost!.likeCount,
    commentCount: reunionPost!.commentCount,
    viewCount: reunionPost!.viewCount,
    liked: reunionPost!.liked,
    createdAt: reunionPost!.createdAt,
    visibility: undefined as any,
  } : post;

  // 댓글
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);

  // 메뉴 모달
  const [showMenu, setShowMenu] = useState(false);

  const actualPostId = isReunion ? reunionPost!.id : postId;

  const fetchPost = useCallback(async () => {
    if (isReunion || !postId || !user?.userId) return;
    try {
      const data = await postAPI.getPost(postId, user.userId);
      setPost(data);
    } catch {
      Alert.alert('오류', '게시글을 불러올 수 없습니다.');
      navigation?.goBack?.();
    } finally {
      setLoading(false);
    }
  }, [postId, user?.userId, isReunion]);

  const fetchComments = useCallback(async () => {
    if (!actualPostId) return;
    setCommentsLoading(true);
    try {
      if (isReunion) {
        const data = await reunionAPI.getComments(actualPostId, user?.userId || '');
        // ReunionCommentResponse → CommentResponse 변환
        const mapped: CommentResponse[] = data.map((c: ReunionCommentResponse) => ({
          id: c.id,
          postId: actualPostId,
          content: c.content,
          author: { userId: c.authorUserId, name: c.authorName, profileImageUrl: c.authorProfileImageUrl || '', schoolName: '', graduationYear: '' },
          createdAt: c.createdAt,
          canDelete: c.authorUserId === user?.userId,
          canEdit: c.authorUserId === user?.userId,
          mentionedUsers: [],
          replies: (c.replies || []).map((r: ReunionCommentResponse) => ({
            id: r.id,
            postId: actualPostId,
            content: r.content,
            author: { userId: r.authorUserId, name: r.authorName, profileImageUrl: r.authorProfileImageUrl || '', schoolName: '', graduationYear: '' },
            createdAt: r.createdAt,
            canDelete: r.authorUserId === user?.userId,
            canEdit: r.authorUserId === user?.userId,
            mentionedUsers: [],
            replies: [],
          })),
        }));
        setComments(mapped);
      } else {
        const data = await postAPI.getComments(actualPostId, user?.userId);
        setComments(data);
      }
    } catch {} finally {
      setCommentsLoading(false);
    }
  }, [actualPostId, user?.userId, isReunion]);

  useEffect(() => { fetchPost(); }, [fetchPost]);
  useEffect(() => { fetchComments(); }, [fetchComments]);

  // 포커스 시 새로고침
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchPost();
      fetchComments();
    });
    return unsubscribe;
  }, [navigation, fetchPost, fetchComments]);

  const handleToggleLike = useCallback(async () => {
    if (!user?.userId) return;
    if (isReunion) {
      try {
        await reunionAPI.togglePostLike(actualPostId, user.userId);
      } catch {}
      return;
    }
    if (!post) return;
    setPost(prev => prev ? {
      ...prev,
      liked: !prev.liked,
      likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1,
    } : prev);
    try {
      await postAPI.toggleLike(postId, user.userId);
    } catch {
      setPost(prev => prev ? {
        ...prev,
        liked: !prev.liked,
        likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1,
      } : prev);
    }
  }, [user?.userId, post, postId, isReunion, actualPostId]);

  const handleSendComment = useCallback(async () => {
    if (!user?.userId || !commentText.trim()) return;
    setCommentSending(true);
    try {
      if (isReunion) {
        await reunionAPI.addComment(actualPostId, user.userId, commentText.trim(), replyTo?.id);
      } else {
        await postAPI.addComment(postId, user.userId, commentText.trim(), replyTo?.id);
      }
      setCommentText('');
      setReplyTo(null);
      fetchComments();
    } catch {
      Alert.alert('오류', '댓글 작성에 실패했습니다');
    } finally {
      setCommentSending(false);
    }
  }, [user?.userId, postId, commentText, replyTo, isReunion, actualPostId, fetchComments]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!user?.userId) return;
    const doDelete = Platform.OS === 'web'
      ? window.confirm('이 댓글을 삭제하시겠습니까?')
      : await new Promise<boolean>(resolve =>
          Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
            { text: '취소', onPress: () => resolve(false) },
            { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!doDelete) return;
    try {
      if (isReunion) {
        await reunionAPI.deleteComment(commentId, user.userId);
      } else {
        await postAPI.deleteComment(commentId, user.userId);
      }
      fetchComments();
    } catch {}
  }, [user?.userId, postId, isReunion, fetchComments]);

  const handleDeletePost = useCallback(async () => {
    if (!user?.userId) return;
    setShowMenu(false);
    const doDelete = Platform.OS === 'web'
      ? window.confirm('이 게시글을 삭제하시겠습니까?')
      : await new Promise<boolean>(resolve =>
          Alert.alert('게시글 삭제', '이 게시글을 삭제하시겠습니까?', [
            { text: '취소', onPress: () => resolve(false) },
            { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!doDelete) return;
    try {
      if (isReunion) {
        await reunionAPI.deletePost(actualPostId, user.userId);
      } else {
        await postAPI.deletePost(postId, user.userId);
      }
      navigation?.goBack?.();
    } catch {
      Alert.alert('오류', '삭제에 실패했습니다.');
    }
  }, [user?.userId, postId, navigation, isReunion, actualPostId]);

  const handleEditPost = useCallback(() => {
    if (!post) return;
    setShowMenu(false);
    navigation?.navigate?.('EditPost', {
      postId: post.id,
      content: post.content,
      imageUrls: post.imageUrls || [],
      schoolName: route?.params?.schoolName,
      graduationYear: route?.params?.graduationYear,
    });
  }, [post, navigation, route?.params]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const activePost = displayPost || post;
  if (!activePost) return null;

  const isMyPost = activePost.author.userId === user?.userId;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFE156" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시글</Text>
        {isMyPost ? (
          <TouchableOpacity onPress={() => setShowMenu(true)} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={22} color="#FFE156" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Author */}
        <View style={styles.authorSection}>
          <Avatar uri={activePost.author.profileImageUrl} name={activePost.author.name} size={44} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{activePost.author.name}</Text>
            <View style={styles.metaRow}>
              {activePost.author.schoolName ? (
                <>
                  <Text style={styles.metaText}>{activePost.author.schoolName} {activePost.author.graduationYear}</Text>
                  <Text style={styles.metaDot}> · </Text>
                </>
              ) : null}
              <Text style={styles.metaText}>{formatTimeAgo(activePost.createdAt)}</Text>
            </View>
          </View>
          {activePost.visibility && activePost.visibility !== 'SCHOOL' && (
            <View style={styles.visibilityBadge}>
              <Ionicons
                name={activePost.visibility === 'CLASS' ? 'people' : 'school'}
                size={11}
                color={Colors.primary}
              />
              <Text style={styles.visibilityText}>
                {activePost.visibility === 'CLASS'
                  ? ((activePost as any).targetGrade && (activePost as any).targetClassNumber
                      ? `${(activePost as any).targetGrade}학년 ${(activePost as any).targetClassNumber}반`
                      : '우리반')
                  : '우리학년'}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <Text style={styles.content}>{activePost.content}</Text>

        {/* Images */}
        {activePost.imageUrls && activePost.imageUrls.length > 0 && (
          <FlatList
            data={activePost.imageUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.postImage} resizeMode="cover" />
            )}
            style={styles.imageList}
          />
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {activePost.likeCount > 0 && (
            <Text style={styles.statsText}>
              <Ionicons name="heart" size={12} color={Colors.red} /> {activePost.likeCount}
            </Text>
          )}
          {activePost.commentCount > 0 && (
            <Text style={styles.statsText}>댓글 {activePost.commentCount}개</Text>
          )}
        </View>

        {/* Action bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleToggleLike} activeOpacity={0.6}>
            <Ionicons
              name={activePost.liked ? 'heart' : 'heart-outline'}
              size={20}
              color={activePost.liked ? Colors.red : Colors.gray500}
            />
            <Text style={[styles.actionText, activePost.liked && { color: Colors.red }]}>좋아요</Text>
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>댓글 {comments.length}개</Text>
          {commentsLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={Colors.primary} />
          ) : comments.length === 0 ? (
            <Text style={styles.commentEmpty}>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</Text>
          ) : (
            comments.map(c => (
              <View key={c.id}>
                <View style={styles.commentRow}>
                  <Avatar uri={c.author.profileImageUrl} name={c.author.name} size={30} />
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
                {c.replies?.map(r => (
                  <View key={r.id} style={[styles.commentRow, styles.commentReply]}>
                    <Avatar uri={r.author.profileImageUrl} name={r.author.name} size={24} />
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
            ))
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Reply indicator */}
      {replyTo && (
        <View style={styles.replyBar}>
          <Text style={styles.replyBarText}>{replyTo.name}님에게 답글</Text>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close-circle" size={18} color={Colors.gray400} />
          </TouchableOpacity>
        </View>
      )}

      {/* Comment input */}
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
            <Ionicons name="send" size={16} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* Menu modal */}
      <Modal visible={showMenu} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>게시글 관리</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditPost}>
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
              <Text style={styles.menuItemText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeletePost}>
              <Ionicons name="trash-outline" size={20} color={Colors.red} />
              <Text style={[styles.menuItemText, { color: Colors.red }]}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setShowMenu(false)}>
              <Ionicons name="close-outline" size={20} color={Colors.gray500} />
              <Text style={[styles.menuItemText, { color: Colors.gray500 }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: {
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Fonts.chalk,
    letterSpacing: 1,
  },
  body: { flex: 1 },
  // Author
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  authorInfo: { flex: 1 },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.bold,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  metaDot: { fontSize: 12, color: Colors.textMuted },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  visibilityText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  // Content
  content: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontFamily: Fonts.regular,
  },
  // Images
  imageList: { marginBottom: 4 },
  postImage: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: Colors.gray100,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  statsText: { fontSize: 13, color: Colors.textSecondary },
  // Actions
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    paddingVertical: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray500,
    fontFamily: Fonts.bold,
  },
  // Comments
  commentSection: { paddingHorizontal: 16, paddingTop: 12 },
  commentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
    fontFamily: Fonts.bold,
  },
  commentEmpty: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 8,
  },
  commentBody: { flex: 1 },
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
    fontFamily: Fonts.regular,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  commentTime: { fontSize: 11, color: Colors.textMuted },
  commentReplyBtn: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  commentDeleteBtn: { fontSize: 12, fontWeight: '600', color: Colors.red },
  commentReply: {
    marginLeft: 32,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    paddingLeft: 10,
  },
  // Reply bar
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.primaryLight,
  },
  replyBarText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  // Comment input
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#fff',
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2D5016',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 260,
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    fontFamily: Fonts.bold,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemText: { fontSize: 15, fontWeight: '600', color: Colors.text },
});
