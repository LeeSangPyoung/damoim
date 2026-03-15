import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, Alert, Modal, ScrollView, Image, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import {
  reunionAPI, ReunionResponse, MeetingResponse, ReunionPostResponse,
  FeeGroupResponse, FeeSummaryResponse, JoinRequestResponse, ReunionCommentResponse,
} from '../api/reunion';
import { alumniShopAPI, ShopResponse, CATEGORY_ICONS, OwnerSchoolDetail } from '../api/alumniShop';
import { userAPI } from '../api/user';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import HeaderActions from '../components/HeaderActions';
import NoticeBanner from '../components/NoticeBanner';
import LoadingScreen from '../components/LoadingScreen';

type ScreenView = 'list' | 'detail';
type Tab = 'feed' | 'meetings' | 'fees' | 'members';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function ReunionScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [view, setView] = useState<ScreenView>('list');
  const [reunions, setReunions] = useState<ReunionResponse[]>([]);
  const [selected, setSelected] = useState<ReunionResponse | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Feed
  const [posts, setPosts] = useState<ReunionPostResponse[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [menuPost, setMenuPost] = useState<ReunionPostResponse | null>(null);
  const [editPost, setEditPost] = useState<ReunionPostResponse | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Meetings
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [dateOptions, setDateOptions] = useState<string[]>(['']);
  const [locationOptions, setLocationOptions] = useState<string[]>(['']);
  const [shopList, setShopList] = useState<ShopResponse[]>([]);
  const [showAllShops, setShowAllShops] = useState(false);
  const [mySchools, setMySchools] = useState<{ schoolName: string; grade: string; classNumber: string }[]>([]);

  // Fees
  const [feeGroups, setFeeGroups] = useState<FeeGroupResponse[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeSummaryResponse | null>(null);

  // Members
  const [joinRequests, setJoinRequests] = useState<JoinRequestResponse[]>([]);

  // Reunion menu (edit/delete)
  const [menuReunion, setMenuReunion] = useState<ReunionResponse | null>(null);
  const [editingReunion, setEditingReunion] = useState<ReunionResponse | null>(null);
  const [showEditReunionModal, setShowEditReunionModal] = useState(false);
  const [editReunionName, setEditReunionName] = useState('');
  const [editReunionDesc, setEditReunionDesc] = useState('');
  const [editReunionCoverUris, setEditReunionCoverUris] = useState<string[]>([]);

  // Join by code
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Create reunion
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [coverImageUris, setCoverImageUris] = useState<string[]>([]);

  useEffect(() => { if (user) loadReunions(); }, [user]);

  const loadReunions = async () => {
    if (!user) return;
    try {
      const data = await reunionAPI.getMyReunions(user.userId);
      setReunions(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetail = async (reunion: ReunionResponse) => {
    if (!user) return;
    setSelected(reunion);
    setView('detail');
    setTab('feed');
    try {
      const [detail, p, m, fg, fs] = await Promise.all([
        reunionAPI.getReunionDetail(reunion.id, user.userId),
        reunionAPI.getPosts(reunion.id, user.userId),
        reunionAPI.getMeetings(reunion.id, user.userId),
        reunionAPI.getFeeGroups(reunion.id, user.userId).catch(() => []),
        reunionAPI.getFeeSummary(reunion.id, user.userId).catch(() => null),
      ]);
      setSelected(detail);
      setPosts(p);
      setMeetings(m);
      setFeeGroups(fg);
      setFeeSummary(fs);
      if (detail.myRole === 'LEADER' || detail.myRole === 'ADMIN') {
        reunionAPI.getJoinRequests(reunion.id, user.userId).then(setJoinRequests).catch(() => {});
      }
      // Load shops for meeting recommendations
      alumniShopAPI.getShops(user.userId).then(setShopList).catch(() => {});
      // Load my school info
      userAPI.getProfile(user.userId).then(p => {
        if (p.schools) setMySchools(p.schools.map((s: any) => ({ schoolName: s.schoolName, grade: s.grade, classNumber: s.classNumber })));
      }).catch(() => {});
    } catch {}
  };

  const pickCoverImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setCoverImageUris(prev => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const ImagePicker = require('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setCoverImageUris(prev => [...prev, result.assets[0].uri]);
      }
    }
  };

  const removeCoverImage = (index: number) => {
    setCoverImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateReunion = async () => {
    if (!user || !newName.trim()) return;
    try {
      let uploadedCoverUrl: string | undefined;
      if (coverImageUris.length > 0) {
        uploadedCoverUrl = await reunionAPI.uploadImage(coverImageUris[0]);
      }
      await reunionAPI.createReunion(user.userId, { name: newName.trim(), description: newDesc.trim(), coverImageUrl: uploadedCoverUrl, memberIds: [] });
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      setCoverImageUris([]);
      loadReunions();
      Alert.alert('완료', '찐모임이 생성되었습니다!');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error || '생성 실패');
    }
  };

  const handleEditReunion = async () => {
    if (!user || !editingReunion || !editReunionName.trim()) return;
    try {
      let uploadedCoverUrl: string | undefined;
      if (editReunionCoverUris.length > 0 && !editReunionCoverUris[0].startsWith('http')) {
        uploadedCoverUrl = await reunionAPI.uploadImage(editReunionCoverUris[0]);
      } else if (editReunionCoverUris.length > 0) {
        uploadedCoverUrl = editReunionCoverUris[0];
      }
      await reunionAPI.updateReunion(editingReunion.id, user.userId, {
        name: editReunionName.trim(),
        description: editReunionDesc.trim() || undefined,
        coverImageUrl: uploadedCoverUrl,
      });
      setShowEditReunionModal(false);
      setEditingReunion(null);
      loadReunions();
    } catch (e: any) {
      const msg = e?.response?.data?.error || '수정 실패';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('오류', msg);
    }
  };

  const handleDeleteReunion = async (reunion: ReunionResponse) => {
    if (!user) return;
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`"${reunion.name}" 모임을 삭제하시겠습니까?\n모든 데이터가 삭제됩니다.`)
      : await new Promise<boolean>(resolve => {
          Alert.alert('모임 삭제', `"${reunion.name}" 모임을 삭제하시겠습니까?\n모든 데이터가 삭제됩니다.`, [
            { text: '취소', style: 'cancel', onPress: () => resolve(false) },
            { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;
    try {
      await reunionAPI.deleteReunion(reunion.id, user.userId);
      setMenuReunion(null);
      loadReunions();
    } catch (e: any) {
      const msg = e?.response?.data?.error || '삭제 실패';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('오류', msg);
    }
  };

  const openReunionMenu = (reunion: ReunionResponse) => {
    setMenuReunion(reunion);
  };

  const openReunionEdit = (reunion: ReunionResponse) => {
    setEditReunionName(reunion.name);
    setEditReunionDesc(reunion.description || '');
    setEditReunionCoverUris(reunion.coverImageUrl ? [reunion.coverImageUrl] : []);
    setEditingReunion(reunion);
    setMenuReunion(null);
    setShowEditReunionModal(true);
  };

  const handleJoinByCode = async () => {
    if (!user || !joinCode.trim()) return;
    try {
      await reunionAPI.joinByCode(user.userId, joinCode.trim());
      setShowJoinModal(false);
      setJoinCode('');
      loadReunions();
      Alert.alert('완료', '가입 완료!');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error || '가입 실패');
    }
  };

  const handleVote = async (optionId: number) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.vote(optionId, user.userId);
      const m = await reunionAPI.getMeetings(selected.id, user.userId);
      setMeetings(m);
    } catch {}
  };

  const handleCreateMeeting = async () => {
    if (!user || !selected || !meetingTitle.trim()) return;
    try {
      await reunionAPI.createMeeting(selected.id, user.userId, {
        title: meetingTitle.trim(),
        description: meetingDesc.trim() || undefined,
        dateOptions: dateOptions.filter(d => d.trim()),
        locationOptions: locationOptions.filter(l => l.trim()),
      });
      setShowCreateMeeting(false);
      setMeetingTitle('');
      setMeetingDesc('');
      setDateOptions(['']);
      setLocationOptions(['']);
      const m = await reunionAPI.getMeetings(selected.id, user.userId);
      setMeetings(m);
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error || '생성 실패');
    }
  };

  const MAX_POST_IMAGES = 5;

  const pickImagesFor = async (currentImages: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (currentImages.length >= MAX_POST_IMAGES) {
      Alert.alert('알림', `이미지는 최대 ${MAX_POST_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = (e: any) => {
        const files = Array.from(e.target?.files || []) as File[];
        const remaining = MAX_POST_IMAGES - currentImages.length;
        files.slice(0, remaining).forEach(file => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setter(prev => [...prev, reader.result as string].slice(0, MAX_POST_IMAGES));
            }
          };
          reader.readAsDataURL(file);
        });
      };
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_POST_IMAGES - currentImages.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(a => a.uri);
      setter(prev => [...prev, ...newUris].slice(0, MAX_POST_IMAGES));
    }
  };
  const pickPostImages = () => pickImagesFor(newPostImages, setNewPostImages);
  const pickEditImages = () => pickImagesFor(editImages, setEditImages);

  const handleCreatePost = async () => {
    if (!user || !selected || !newPostContent.trim()) return;
    setPostSubmitting(true);
    try {
      let finalUrls: string[] = [];
      if (newPostImages.length > 0) {
        finalUrls = await Promise.all(
          newPostImages.map(uri =>
            uri.startsWith('http') ? Promise.resolve(uri) : reunionAPI.uploadImage(uri)
          )
        );
      }
      await reunionAPI.createPost(selected.id, user.userId, {
        content: newPostContent.trim(),
        imageUrls: finalUrls.length > 0 ? finalUrls : undefined,
      });
      setShowCreatePost(false);
      setNewPostContent('');
      setNewPostImages([]);
      const p = await reunionAPI.getPosts(selected.id, user.userId);
      setPosts(p);
    } catch {
      Alert.alert('오류', '게시글 작성에 실패했습니다.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleToggleFee = async (feeId: number) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.toggleFeePayment(feeId, user.userId);
      const fg = await reunionAPI.getFeeGroups(selected.id, user.userId);
      setFeeGroups(fg);
      const fs = await reunionAPI.getFeeSummary(selected.id, user.userId);
      setFeeSummary(fs);
    } catch {}
  };

  const handleApproveRequest = async (requestId: number) => {
    if (!user) return;
    try {
      await reunionAPI.approveJoinRequest(requestId, user.userId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      if (selected) loadDetail(selected);
    } catch {}
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!user) return;
    try {
      await reunionAPI.rejectJoinRequest(requestId, user.userId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } catch {}
  };

  if (loading) return <LoadingScreen message="찐모임 로딩 중..." />;

  // ===== Detail View =====
  if (view === 'detail' && selected) {
    const isLeader = selected.myRole === 'LEADER' || selected.myRole === 'ADMIN';
    const pendingCount = joinRequests.filter(r => r.status === 'PENDING').length;

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => { setView('list'); setSelected(null); }}>
            <Ionicons name="chevron-back" size={26} color="#FFE156" />
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>{selected.name}</Text>
          <Text style={styles.memberCount}>{selected.memberCount}명</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['feed', 'meetings', 'fees', 'members'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'feed' ? '피드' : t === 'meetings' ? '모임' : t === 'fees' ? '회비' : '멤버'}
                {t === 'members' && pendingCount > 0 && ` (${pendingCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feed Tab */}
        {tab === 'feed' && (
          <View style={{ flex: 1 }}>
            <FlatList
              data={posts}
              keyExtractor={item => String(item.id)}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); selected && loadDetail(selected); }} />}
              ListEmptyComponent={<EmptyState ionIcon="document-text-outline" title="아직 게시글이 없습니다" />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.postCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('PostDetail', { reunionPost: item })}
                >
                  <View style={styles.postHeader}>
                    <Avatar uri={item.authorProfileImageUrl} name={item.authorName} size={36} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={styles.postAuthor}>{item.authorName}</Text>
                      <Text style={styles.postTime}>{timeAgo(item.createdAt)}</Text>
                    </View>
                    {user?.userId === item.authorUserId && (
                      <TouchableOpacity
                        onPress={() => setMenuPost(item)}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color={Colors.gray400} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.postContent}>{item.content}</Text>
                  {item.imageUrls.length > 0 && (
                    <ScrollView horizontal style={{ marginTop: 8 }}>
                      {item.imageUrls.map((url, i) => (
                        <Image key={i} source={{ uri: url }} style={styles.postImage} />
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.postActions}>
                    <TouchableOpacity onPress={async () => {
                      if (!user) return;
                      try {
                        await reunionAPI.togglePostLike(item.id, user.userId);
                        const p = await reunionAPI.getPosts(selected.id, user.userId);
                        setPosts(p);
                      } catch {}
                    }}>
                      <Text style={[styles.postAction, item.liked && { color: Colors.red }]}>
                        {item.liked ? '❤️' : '🤍'} {item.likeCount}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.postAction}>💬 {item.commentCount}</Text>
                    <Text style={styles.postAction}>👁 {item.viewCount}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.fab} onPress={() => setShowCreatePost(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Post Menu Modal */}
            <Modal visible={!!menuPost} transparent animationType="fade" onRequestClose={() => setMenuPost(null)}>
              <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuPost(null)}>
                <View style={styles.menuSheet}>
                  <TouchableOpacity style={styles.menuItem} onPress={() => {
                    if (!menuPost) return;
                    setEditContent(menuPost.content);
                    setEditImages(menuPost.imageUrls || []);
                    setEditPost(menuPost);
                    setMenuPost(null);
                  }}>
                    <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    <Text style={styles.menuItemText}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={async () => {
                    if (!menuPost || !user || !selected) return;
                    const postToDelete = menuPost;
                    setMenuPost(null);
                    Alert.alert('삭제', '게시글을 삭제하시겠습니까?', [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: async () => {
                        try {
                          await reunionAPI.deletePost(postToDelete.id, user.userId);
                          const p = await reunionAPI.getPosts(selected.id, user.userId);
                          setPosts(p);
                        } catch { Alert.alert('오류', '삭제에 실패했습니다.'); }
                      }},
                    ]);
                  }}>
                    <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                    <Text style={[styles.menuItemText, { color: '#D32F2F' }]}>삭제</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setMenuPost(null)}>
                    <Text style={styles.menuItemText}>취소</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Edit Post Modal - Full Screen */}
            <Modal visible={!!editPost} animationType="slide">
              <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: '#FFF8E7' }}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
              >
                <View style={styles.createPostHeader}>
                  <TouchableOpacity onPress={() => { setEditPost(null); setEditContent(''); setEditImages([]); }} activeOpacity={0.7}>
                    <Ionicons name="close" size={26} color="#FFE156" />
                  </TouchableOpacity>
                  <Text style={styles.createPostHeaderTitle}>글 수정</Text>
                  <TouchableOpacity
                    style={[styles.createPostSubmitBtn, (!editContent.trim() || editSubmitting) && { backgroundColor: '#ccc' }]}
                    onPress={async () => {
                      if (!editPost || !user || !selected || !editContent.trim()) return;
                      setEditSubmitting(true);
                      try {
                        let finalUrls: string[] = [];
                        if (editImages.length > 0) {
                          finalUrls = await Promise.all(
                            editImages.map(uri =>
                              uri.startsWith('http') ? Promise.resolve(uri) : reunionAPI.uploadImage(uri)
                            )
                          );
                        }
                        await reunionAPI.updatePost(editPost.id, user.userId, {
                          content: editContent.trim(),
                          imageUrls: finalUrls.length > 0 ? finalUrls : undefined,
                        });
                        setEditPost(null);
                        setEditContent('');
                        setEditImages([]);
                        const p = await reunionAPI.getPosts(selected.id, user.userId);
                        setPosts(p);
                      } catch {
                        Alert.alert('오류', '수정에 실패했습니다.');
                      } finally {
                        setEditSubmitting(false);
                      }
                    }}
                    disabled={!editContent.trim() || editSubmitting}
                    activeOpacity={0.7}
                  >
                    {editSubmitting ? (
                      <ActivityIndicator size="small" color="#2D5016" />
                    ) : (
                      <Text style={styles.createPostSubmitText}>수정</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                  <TextInput
                    style={styles.createPostInput}
                    placeholder="내용을 입력하세요..."
                    placeholderTextColor={Colors.textMuted}
                    value={editContent}
                    onChangeText={setEditContent}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                  />
                  <View style={{ marginTop: 4, marginBottom: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                      {editImages.map((uri, index) => (
                        <View key={`${uri}-${index}`} style={{ position: 'relative', borderRadius: 12, overflow: 'visible' }}>
                          <Image source={{ uri }} style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#F0E0B0' }} />
                          {index === 0 && editImages.length > 1 && (
                            <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: '#2D5016', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFE156' }}>대표</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={{ position: 'absolute', top: 4, right: 4, zIndex: 10 }}
                            onPress={() => setEditImages(prev => prev.filter((_, i) => i !== index))}
                            activeOpacity={0.7}
                          >
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
                              <Ionicons name="close" size={12} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      ))}
                      {editImages.length < MAX_POST_IMAGES && (
                        <TouchableOpacity
                          style={{ width: 88, height: 88, borderRadius: 12, borderWidth: 1.5, borderColor: '#F0E0B0', borderStyle: 'dashed', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', gap: 2 }}
                          onPress={pickEditImages}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={28} color={Colors.gray400} />
                          <Text style={{ fontSize: 11, color: Colors.gray400, fontWeight: '500' }}>{editImages.length}/{MAX_POST_IMAGES}</Text>
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  </View>
                </ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0E0B0', backgroundColor: '#fff' }}>
                  <Text style={{ fontSize: 12, color: Colors.textMuted }}>{editContent.length}자</Text>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        )}

        {/* Meetings Tab */}
        {tab === 'meetings' && (
          <FlatList
            data={meetings}
            keyExtractor={item => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); selected && loadDetail(selected); }} />}
            ListHeaderComponent={
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowCreateMeeting(true)}>
                <Text style={styles.primaryBtnText}>+ 모임 만들기</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={<EmptyState ionIcon="calendar-outline" title="모임이 없습니다" />}
            renderItem={({ item: mt }) => {
              const isConfirmed = mt.status === 'CONFIRMED';
              const isCancelled = mt.status === 'CANCELLED';
              const statusColor = isConfirmed ? Colors.green : isCancelled ? Colors.red : '#2D5016';
              const statusLabel = isConfirmed ? '확정' : isCancelled ? '취소됨' : '투표 중';

              // Find shop from confirmed location
              const findShop = (loc: string): ShopResponse | null => {
                const match = loc.match(/^(.+?)\s*\((.+)\)$/);
                if (!match) return null;
                return shopList.find(s => s.shopName === match[1]) || null;
              };
              const confirmedShop = isConfirmed && mt.finalLocation ? findShop(mt.finalLocation) : null;

              // Attendees calculation
              const confirmedDateOpt = mt.dateOptions.find(o => o.optionValue === mt.finalDate);
              const confirmedLocOpt = mt.locationOptions.find(o => o.optionValue === mt.finalLocation);
              const locVoterIds = new Set(confirmedLocOpt?.voters.map(v => v.userId) || []);
              const attendees = confirmedDateOpt && confirmedLocOpt
                ? confirmedDateOpt.voters.filter(v => locVoterIds.has(v.userId))
                : (confirmedDateOpt?.voters || confirmedLocOpt?.voters || []);

              return (
                <View style={styles.meetingCard}>
                  <View style={styles.meetingHeader}>
                    <Text style={styles.meetingTitle}>{mt.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusText}>{statusLabel}</Text>
                    </View>
                  </View>

                  {isConfirmed && (
                    <View>
                      <Text style={styles.confirmedDate}>📅 {mt.finalDate}</Text>

                      {/* Rich Shop Card */}
                      {confirmedShop ? (
                        <View style={styles.shopCard}>
                          {confirmedShop.imageUrl && (
                            <Image source={{ uri: confirmedShop.imageUrl }} style={styles.shopImg} />
                          )}
                          <View style={styles.shopInfo}>
                            <View style={styles.shopNameRow}>
                              <Text style={styles.shopIcon}>{CATEGORY_ICONS[confirmedShop.category] || '🏪'}</Text>
                              <Text style={styles.shopName}>{confirmedShop.shopName}</Text>
                              {confirmedShop.averageRating != null && (
                                <Text style={styles.shopRating}>★ {confirmedShop.averageRating.toFixed(1)}</Text>
                              )}
                            </View>
                            <Text style={styles.shopAddress}>{confirmedShop.address}</Text>
                            <View style={styles.shopMeta}>
                              <Text style={styles.shopOwner}>{confirmedShop.ownerName} 사장</Text>
                              {confirmedShop.phone && <Text style={styles.shopPhone}>📞 {confirmedShop.phone}</Text>}
                              {confirmedShop.businessHours && <Text style={styles.shopHours}>🕐 {confirmedShop.businessHours}</Text>}
                            </View>
                          </View>
                          <View style={styles.shopBadge}>
                            <Text style={styles.shopBadgeText}>동창이네</Text>
                          </View>
                        </View>
                      ) : mt.finalLocation ? (
                        <Text style={styles.confirmedLocation}>📍 {mt.finalLocation}</Text>
                      ) : null}

                      {/* Vote Results */}
                      <View style={styles.voteResultsContainer}>
                        <Text style={styles.voteResultsTitle}>📊 투표 결과</Text>
                        {mt.dateOptions.length > 0 && (
                          <View style={styles.voteGroup}>
                            <Text style={styles.voteGroupLabel}>날짜</Text>
                            {mt.dateOptions.map(opt => {
                              const isSel = opt.optionValue === mt.finalDate;
                              const maxVotes = Math.max(1, ...mt.dateOptions.map(o => o.voteCount));
                              const pct = (opt.voteCount / maxVotes) * 100;
                              return (
                                <View key={opt.id} style={[styles.voteRow, isSel && styles.voteRowSelected]}>
                                  <View style={styles.voteRowTop}>
                                    {isSel && <View style={styles.voteCheck}><Text style={styles.voteCheckText}>✓</Text></View>}
                                    <Text style={[styles.voteText, isSel && { fontWeight: '700' }]}>{opt.optionValue}</Text>
                                    <View style={[styles.voteBadge, opt.voteCount === 0 && styles.voteBadgeZero]}>
                                      <Text style={[styles.voteBadgeText, opt.voteCount === 0 && { color: Colors.gray400 }]}>{opt.voteCount}표</Text>
                                    </View>
                                  </View>
                                  <View style={styles.voteBar}>
                                    <View style={[styles.voteBarFill, isSel ? styles.voteBarSelected : null, { width: `${pct}%` }]} />
                                  </View>
                                  {opt.voters.length > 0 && (
                                    <Text style={styles.voteNames}>{opt.voters.map(v => v.name).join(', ')}</Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                        {mt.locationOptions.length > 0 && (
                          <View style={styles.voteGroup}>
                            <Text style={styles.voteGroupLabel}>장소</Text>
                            {mt.locationOptions.map(opt => {
                              const isSel = opt.optionValue === mt.finalLocation;
                              const maxVotes = Math.max(1, ...mt.locationOptions.map(o => o.voteCount));
                              const pct = (opt.voteCount / maxVotes) * 100;
                              const shop = findShop(opt.optionValue);
                              const displayName = shop ? shop.shopName : opt.optionValue;
                              return (
                                <View key={opt.id} style={[styles.voteRow, isSel && styles.voteRowSelected]}>
                                  <View style={styles.voteRowTop}>
                                    {isSel && <View style={styles.voteCheck}><Text style={styles.voteCheckText}>✓</Text></View>}
                                    <Text style={[styles.voteText, isSel && { fontWeight: '700' }]} numberOfLines={1}>
                                      {displayName}
                                    </Text>
                                    {shop && <View style={styles.miniShopBadge}><Text style={styles.miniShopBadgeText}>동창이네</Text></View>}
                                    <View style={[styles.voteBadge, opt.voteCount === 0 && styles.voteBadgeZero]}>
                                      <Text style={[styles.voteBadgeText, opt.voteCount === 0 && { color: Colors.gray400 }]}>{opt.voteCount}표</Text>
                                    </View>
                                  </View>
                                  <View style={styles.voteBar}>
                                    <View style={[styles.voteBarFill, isSel ? styles.voteBarSelected : null, { width: `${pct}%` }]} />
                                  </View>
                                  {opt.voters.length > 0 && (
                                    <Text style={styles.voteNames}>{opt.voters.map(v => v.name).join(', ')}</Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>

                      {/* Attendees */}
                      <View style={styles.attendeesBox}>
                        <Text style={styles.attendeesTitle}>참석 예정 {attendees.length}/{selected.memberCount}명</Text>
                        <View style={styles.attendeesList}>
                          {attendees.map(v => (
                            <View key={v.userId} style={styles.attendeeChip}>
                              <Text style={styles.attendeeText}>👤 {v.name}</Text>
                            </View>
                          ))}
                          {attendees.length === 0 && <Text style={styles.noAttendees}>투표 데이터 없음</Text>}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Voting state */}
                  {mt.status === 'VOTING' && (
                    <View>
                      {mt.dateOptions.length > 0 && (
                        <View style={styles.voteSection}>
                          <Text style={styles.voteSectionTitle}>📅 날짜 투표</Text>
                          {mt.dateOptions.map(opt => (
                            <TouchableOpacity key={opt.id} style={[styles.voteOption, opt.myVote && styles.voteOptionVoted]} onPress={() => handleVote(opt.id)}>
                              {opt.myVote && <Text style={styles.voteOptCheck}>✓</Text>}
                              <Text style={styles.voteOptText}>{opt.optionValue}</Text>
                              <Text style={styles.voteOptCount}>{opt.voteCount}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {mt.locationOptions.length > 0 && (
                        <View style={styles.voteSection}>
                          <Text style={styles.voteSectionTitle}>📍 장소 투표</Text>
                          {mt.locationOptions.map(opt => {
                            const shop = findShop(opt.optionValue);
                            return (
                              <TouchableOpacity key={opt.id} style={[styles.voteOption, opt.myVote && styles.voteOptionVoted]} onPress={() => handleVote(opt.id)}>
                                {opt.myVote && <Text style={styles.voteOptCheck}>✓</Text>}
                                {shop ? (
                                  <View style={styles.voteShopInfo}>
                                    {shop.imageUrl && <Image source={{ uri: shop.imageUrl }} style={styles.voteShopThumb} />}
                                    <View style={{ flex: 1 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={styles.voteShopName}>{shop.shopName}</Text>
                                        {shop.averageRating != null && <Text style={styles.shopRating}>★ {shop.averageRating.toFixed(1)}</Text>}
                                        <View style={styles.miniShopBadge}><Text style={styles.miniShopBadgeText}>동창이네</Text></View>
                                      </View>
                                      <Text style={styles.voteShopAddr}>{shop.address}</Text>
                                      <Text style={styles.voteShopMeta}>{shop.ownerName} 사장 {shop.phone ? `· ${shop.phone}` : ''}</Text>
                                    </View>
                                  </View>
                                ) : (
                                  <Text style={styles.voteOptText}>{opt.optionValue}</Text>
                                )}
                                <Text style={styles.voteOptCount}>{opt.voteCount}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        {/* Fees Tab */}
        {tab === 'fees' && (
          <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); selected && loadDetail(selected); }} />}>
            {feeSummary && (
              <View style={styles.feeSummary}>
                <Text style={styles.feeSummaryTitle}>회비 현황</Text>
                <View style={styles.feeSummaryRow}>
                  <View style={styles.feeSummaryItem}>
                    <Text style={styles.feeSummaryValue}>{feeSummary.totalAmount.toLocaleString()}원</Text>
                    <Text style={styles.feeSummaryLabel}>총 금액</Text>
                  </View>
                  <View style={styles.feeSummaryItem}>
                    <Text style={[styles.feeSummaryValue, { color: Colors.green }]}>{feeSummary.totalPaid.toLocaleString()}원</Text>
                    <Text style={styles.feeSummaryLabel}>납부</Text>
                  </View>
                  <View style={styles.feeSummaryItem}>
                    <Text style={[styles.feeSummaryValue, { color: Colors.red }]}>{feeSummary.totalUnpaid.toLocaleString()}원</Text>
                    <Text style={styles.feeSummaryLabel}>미납</Text>
                  </View>
                </View>
              </View>
            )}
            {feeGroups.map(fg => (
              <View key={fg.id} style={styles.feeGroupCard}>
                <View style={styles.feeGroupHeader}>
                  <Text style={styles.feeGroupDesc}>{fg.description}</Text>
                  <Text style={styles.feeGroupAmount}>{fg.amountPerMember.toLocaleString()}원/인</Text>
                </View>
                <Text style={styles.feeGroupProgress}>{fg.paidCount}/{fg.totalMembers}명 납부</Text>
                {fg.fees.map(fee => (
                  <TouchableOpacity key={fee.id} style={styles.feeItem} onPress={() => handleToggleFee(fee.id)}>
                    <Text style={styles.feeName}>{fee.userName}</Text>
                    <View style={[styles.feeStatus, { backgroundColor: fee.status === 'PAID' ? Colors.greenLight : Colors.redLight }]}>
                      <Text style={{ color: fee.status === 'PAID' ? Colors.green : Colors.red, fontSize: 12, fontWeight: '600' }}>
                        {fee.status === 'PAID' ? '납부' : '미납'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            {feeGroups.length === 0 && <EmptyState ionIcon="wallet-outline" title="회비 내역이 없습니다" />}
          </ScrollView>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <ScrollView style={{ flex: 1 }}>
            {/* Invite Code */}
            {selected.inviteCode && (
              <View style={styles.inviteCodeBox}>
                <Text style={styles.inviteCodeLabel}>초대 코드</Text>
                <Text style={styles.inviteCode}>{selected.inviteCode}</Text>
              </View>
            )}

            {/* Join Requests */}
            {isLeader && joinRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>가입 신청</Text>
                {joinRequests.filter(r => r.status === 'PENDING').map(req => (
                  <View key={req.id} style={styles.requestRow}>
                    <Avatar uri={req.profileImageUrl} name={req.userName} size={36} />
                    <Text style={styles.requestName}>{req.userName}</Text>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveRequest(req.id)}>
                      <Text style={styles.approveBtnText}>승인</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(req.id)}>
                      <Text style={styles.rejectBtnText}>거절</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Member List */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>멤버 ({selected.memberCount}명)</Text>
              {selected.members.map(m => (
                <View key={m.memberId} style={styles.memberRow}>
                  <Avatar uri={m.profileImageUrl} name={m.name} size={40} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>
                      {m.role === 'LEADER' ? '모임장' : m.role === 'TREASURER' ? '총무' : '멤버'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Create Post Modal - Full Screen */}
        <Modal visible={showCreatePost} animationType="slide">
          <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FFF8E7' }}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
          >
            {/* Header */}
            <View style={styles.createPostHeader}>
              <TouchableOpacity onPress={() => { setShowCreatePost(false); setNewPostContent(''); setNewPostImages([]); }} activeOpacity={0.7}>
                <Ionicons name="close" size={26} color="#FFE156" />
              </TouchableOpacity>
              <Text style={styles.createPostHeaderTitle}>글 작성</Text>
              <TouchableOpacity
                style={[styles.createPostSubmitBtn, (!newPostContent.trim() || postSubmitting) && { backgroundColor: '#ccc' }]}
                onPress={handleCreatePost}
                disabled={!newPostContent.trim() || postSubmitting}
                activeOpacity={0.7}
              >
                {postSubmitting ? (
                  <ActivityIndicator size="small" color="#2D5016" />
                ) : (
                  <Text style={styles.createPostSubmitText}>게시</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {/* Content input */}
              <TextInput
                style={styles.createPostInput}
                placeholder="동창들에게 공유하고 싶은 이야기를 적어보세요..."
                placeholderTextColor={Colors.textMuted}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
                textAlignVertical="top"
                autoFocus
              />

              {/* Image section */}
              <View style={{ marginTop: 4, marginBottom: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                  {newPostImages.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={{ position: 'relative', borderRadius: 12, overflow: 'visible' }}>
                      <Image source={{ uri }} style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#F0E0B0' }} />
                      {index === 0 && newPostImages.length > 1 && (
                        <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: '#2D5016', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFE156' }}>대표</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={{ position: 'absolute', top: 4, right: 4, zIndex: 10 }}
                        onPress={() => setNewPostImages(prev => prev.filter((_, i) => i !== index))}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="close" size={12} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {newPostImages.length < MAX_POST_IMAGES && (
                    <TouchableOpacity
                      style={{ width: 88, height: 88, borderRadius: 12, borderWidth: 1.5, borderColor: '#F0E0B0', borderStyle: 'dashed', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', gap: 2 }}
                      onPress={pickPostImages}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={28} color={Colors.gray400} />
                      <Text style={{ fontSize: 11, color: Colors.gray400, fontWeight: '500' }}>{newPostImages.length}/{MAX_POST_IMAGES}</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Bottom bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0E0B0', backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>{newPostContent.length}자</Text>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Create Meeting Modal */}
        <Modal visible={showCreateMeeting} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior="padding" style={styles.modalContent}>
              <ScrollView>
                <Text style={styles.modalTitle}>모임 만들기</Text>
                <Text style={styles.inputLabel}>제목 *</Text>
                <TextInput style={styles.input} placeholder="모임 제목" value={meetingTitle} onChangeText={setMeetingTitle} />
                <Text style={styles.inputLabel}>설명</Text>
                <TextInput style={styles.input} placeholder="모임 설명" value={meetingDesc} onChangeText={setMeetingDesc} />

                <Text style={styles.inputLabel}>날짜 옵션</Text>
                {dateOptions.map((d, i) => (
                  <View key={i} style={styles.optionRow}>
                    {Platform.OS === 'web' ? (
                      <input
                        type="datetime-local"
                        value={d}
                        onChange={(e: any) => { const arr = [...dateOptions]; arr[i] = e.target.value; setDateOptions(arr); }}
                        style={{
                          flex: 1, padding: 12, fontSize: 14, borderRadius: 10,
                          border: '1.5px solid #F0E0B0', backgroundColor: '#fff',
                          fontFamily: 'inherit', color: '#3E2723',
                        } as any}
                      />
                    ) : (
                      <TouchableOpacity
                        style={[styles.input, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => {
                          const now = new Date();
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          const hours = String(now.getHours()).padStart(2, '0');
                          const mins = String(now.getMinutes()).padStart(2, '0');
                          const defaultVal = d || `${year}-${month}-${day}T${hours}:${mins}`;
                          const arr = [...dateOptions]; arr[i] = defaultVal; setDateOptions(arr);
                        }}
                      >
                        <Text style={{ color: d ? '#3E2723' : '#9e9e9e', fontSize: 14 }}>
                          {d ? d.replace('T', ' ') : '날짜를 선택하세요'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {dateOptions.length > 1 && (
                      <TouchableOpacity onPress={() => setDateOptions(dateOptions.filter((_, j) => j !== i))}>
                        <Text style={styles.removeOption}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={() => setDateOptions([...dateOptions, ''])}>
                  <Text style={styles.addOption}>+ 날짜 추가</Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>장소 옵션</Text>
                {locationOptions.map((l, i) => (
                  <View key={i} style={styles.optionRow}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="예: 강남역 근처" value={l}
                      onChangeText={v => { const arr = [...locationOptions]; arr[i] = v; setLocationOptions(arr); }} />
                    {locationOptions.length > 1 && (
                      <TouchableOpacity onPress={() => setLocationOptions(locationOptions.filter((_, j) => j !== i))}>
                        <Text style={styles.removeOption}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={() => setLocationOptions([...locationOptions, ''])}>
                  <Text style={styles.addOption}>+ 장소 추가</Text>
                </TouchableOpacity>

                {/* Shop Recommendations */}
                {shopList.length > 0 && (
                  <View style={styles.shopRecommend}>
                    <Text style={styles.shopRecommendTitle}>🏪 동창이네 추천</Text>
                    {(showAllShops ? shopList : shopList.slice(0, 3)).map(shop => {
                      const label = `${shop.shopName} (${shop.address})`;
                      const added = locationOptions.includes(label);
                      return (
                        <TouchableOpacity key={shop.id} style={[styles.shopRecommendItem, added && { opacity: 0.5 }]}
                          onPress={() => {
                            if (added) return;
                            const emptyIdx = locationOptions.findIndex(l => !l.trim());
                            if (emptyIdx >= 0) {
                              const arr = [...locationOptions]; arr[emptyIdx] = label; setLocationOptions(arr);
                            } else {
                              setLocationOptions([...locationOptions, label]);
                            }
                          }}>
                          {shop.imageUrl ? (
                            <Image source={{ uri: shop.imageUrl }} style={styles.shopRecommendImg} />
                          ) : (
                            <View style={styles.shopRecommendPlaceholder}>
                              <Text>{CATEGORY_ICONS[shop.category] || '🏪'}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.shopRecommendName}>
                              {CATEGORY_ICONS[shop.category] || ''} {shop.shopName}
                              {shop.averageRating != null && ` ★${shop.averageRating.toFixed(1)}`}
                            </Text>
                            <Text style={styles.shopRecommendAddr}>{shop.address}</Text>
                            <Text style={styles.shopRecommendMeta}>
                              {shop.ownerName} 사장 · {shop.subCategory || shop.category}
                              {(() => {
                                if (!shop.ownerSchoolDetails || !mySchools.length) return '';
                                const matches = shop.ownerSchoolDetails.filter(s =>
                                  mySchools.some(my => my.schoolName === s.schoolName && my.grade === s.grade && my.classNumber === s.classNumber)
                                );
                                if (matches.length === 0) return shop.ownerSchools?.[0] ? `\n✎ ${shop.ownerSchools[0]}` : '';
                                const labels = [...new Set(matches.map(s => {
                                  const shortName = s.schoolName.replace(/(초등학교|중학교|고등학교|대학교)/, (m: string) =>
                                    m === '초등학교' ? '초' : m === '중학교' ? '중' : m === '고등학교' ? '고' : '대'
                                  );
                                  return `${shortName} ${s.grade}-${s.classNumber}반`;
                                }))];
                                return `\n🤝 나와 ${labels.join(', ')} 동창`;
                              })()}
                            </Text>
                          </View>
                          <Text style={added ? styles.shopAddedLabel : styles.shopAddLabel}>{added ? '추가됨' : '+ 추가'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {shopList.length > 3 && (
                      <TouchableOpacity onPress={() => setShowAllShops(!showAllShops)} style={{ alignItems: 'center', paddingVertical: 6 }}>
                        <Text style={{ fontSize: 12, color: '#92400e', fontFamily: Fonts.bold }}>
                          {showAllShops ? '접기 ▲' : `더보기 (${shopList.length - 3}개) ▼`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateMeeting(false)}><Text style={styles.cancelBtnText}>취소</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateMeeting}><Text style={styles.submitBtnText}>만들기</Text></TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    );
  }

  // ===== List View =====
  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="people" size={33} color="#fff" style={{ marginTop: -3 }} />
          <Text style={styles.screenTitle}>찐모임</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>

      <NoticeBanner />

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.white, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowJoinModal(true)}>
          <Text style={styles.headerBtnText}>코드 가입</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: '#2D5016' }]} onPress={() => setShowCreateModal(true)}>
          <Text style={[styles.headerBtnText, { color: Colors.white }]}>+ 만들기</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reunions}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReunions(); }} />}
        ListEmptyComponent={<EmptyState ionIcon="people-outline" title="참여 중인 찐모임이 없습니다" subtitle="모임을 만들거나 초대 코드로 가입하세요" />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.reunionCard} onPress={() => loadDetail(item)}>
            {item.coverImageUrl ? (
              <Image source={{ uri: item.coverImageUrl }} style={styles.reunionCover} />
            ) : (
              <View style={[styles.reunionCover, { backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 28 }}>👥</Text>
              </View>
            )}
            <View style={styles.reunionInfo}>
              <Text style={styles.reunionName}>{item.name}</Text>
              {item.description && <Text style={styles.reunionDesc} numberOfLines={1}>{item.description}</Text>}
              <View style={styles.reunionMeta}>
                <Text style={styles.reunionMetaText}>{item.memberCount}명</Text>
                {item.schoolName && <Text style={styles.reunionMetaText}>{item.schoolName}</Text>}
              </View>
            </View>
            {user?.userId === item.createdByUserId && (
              <TouchableOpacity
                style={styles.reunionMenuBtn}
                onPress={(e) => { e.stopPropagation(); openReunionMenu(item); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Create Reunion Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>찐모임 만들기</Text>
            <Text style={styles.inputLabel}>사진 (첫 번째가 대표 사진)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingTop: 6 }}>
              {coverImageUris.map((uri, idx) => (
                <View key={idx} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                  {idx === 0 && <View style={styles.repBadge}><Text style={styles.repBadgeText}>대표</Text></View>}
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeCoverImage(idx)}>
                    <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.coverPlaceholder} onPress={pickCoverImage}>
                <Ionicons name="camera-outline" size={28} color={Colors.gray400} />
                <Text style={styles.coverPlaceholderText}>추가</Text>
              </TouchableOpacity>
            </ScrollView>
            <Text style={styles.inputLabel}>모임 이름 *</Text>
            <TextInput style={styles.input} placeholder="모임 이름" value={newName} onChangeText={setNewName} />
            <Text style={styles.inputLabel}>설명</Text>
            <TextInput style={styles.textArea} placeholder="모임 설명" value={newDesc} onChangeText={setNewDesc} multiline numberOfLines={3} textAlignVertical="top" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowCreateModal(false); setCoverImageUris([]); }}><Text style={styles.cancelBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateReunion}><Text style={styles.submitBtnText}>만들기</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Reunion Modal */}
      <Modal visible={showEditReunionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>모임 수정</Text>
            <Text style={styles.inputLabel}>대표 사진</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingTop: 6 }}>
              {editReunionCoverUris.map((uri, idx) => (
                <View key={idx} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setEditReunionCoverUris(prev => prev.filter((_, i) => i !== idx))}>
                    <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              {editReunionCoverUris.length === 0 && (
                <TouchableOpacity style={styles.coverPlaceholder} onPress={async () => {
                  if (Platform.OS === 'web') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target?.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') setEditReunionCoverUris([reader.result]);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  } else {
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
                    if (!result.canceled && result.assets[0]) setEditReunionCoverUris([result.assets[0].uri]);
                  }
                }}>
                  <Ionicons name="camera-outline" size={28} color={Colors.gray400} />
                  <Text style={styles.coverPlaceholderText}>추가</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <Text style={styles.inputLabel}>모임 이름 *</Text>
            <TextInput style={styles.input} placeholder="모임 이름" value={editReunionName} onChangeText={setEditReunionName} />
            <Text style={styles.inputLabel}>설명</Text>
            <TextInput style={styles.textArea} placeholder="모임 설명" value={editReunionDesc} onChangeText={setEditReunionDesc} multiline numberOfLines={3} textAlignVertical="top" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowEditReunionModal(false); setEditingReunion(null); }}><Text style={styles.cancelBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleEditReunion}><Text style={styles.submitBtnText}>수정</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join by Code Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>초대 코드로 가입</Text>
            <TextInput style={styles.input} placeholder="초대 코드 입력" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" maxLength={10} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoinModal(false)}><Text style={styles.cancelBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleJoinByCode}><Text style={styles.submitBtnText}>가입</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reunion Menu Modal (수정/삭제) */}
      <Modal visible={!!menuReunion} animationType="fade" transparent>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuReunion(null)}>
          <View style={styles.menuSheet}>
            <Text style={{ fontFamily: Fonts.bold, fontSize: 15, color: Colors.text, textAlign: 'center', marginBottom: 8 }}>{menuReunion?.name}</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => menuReunion && openReunionEdit(menuReunion)}>
              <Ionicons name="create-outline" size={20} color={Colors.text} />
              <Text style={styles.menuItemText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => menuReunion && handleDeleteReunion(menuReunion)}>
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
              <Text style={[styles.menuItemText, { color: '#FF4444' }]}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setMenuReunion(null)}>
              <Ionicons name="close-outline" size={20} color={Colors.textMuted} />
              <Text style={[styles.menuItemText, { color: Colors.textMuted }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },

  // List
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, backgroundColor: '#2D5016', borderBottomWidth: 3, borderBottomColor: '#C49A2A' },
  screenTitle: { fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Fonts.chalk, letterSpacing: 2 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.gray100 },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gray700 },

  reunionCard: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#F0E0B0', marginHorizontal: 12, marginTop: 10, borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  reunionCover: { width: 80, height: 80 },
  reunionInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  reunionName: { fontSize: 15, fontWeight: '700', color: Colors.text, fontFamily: Fonts.bold },
  reunionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  reunionMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  reunionMetaText: { fontSize: 11, color: Colors.textMuted },
  reunionMenuBtn: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },

  // Detail
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, paddingTop: HEADER_TOP_PADDING, backgroundColor: '#2D5016', borderBottomWidth: 3, borderBottomColor: '#C49A2A', gap: 10 },
  backBtn: { fontSize: 15, color: '#FFE156', fontWeight: '600' },
  detailTitle: { flex: 1, fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold, letterSpacing: 2 },
  memberCount: { fontSize: 13, color: '#FFE156' },

  tabRow: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2D5016' },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.gray400, fontFamily: Fonts.bold },
  tabTextActive: { color: '#2D5016' },

  // Post
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2D5016', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5,
  },
  postCard: { marginHorizontal: 12, marginTop: 10, padding: 14, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#F0E0B0' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  postAuthor: { fontSize: 14, fontWeight: '600', color: Colors.text, fontFamily: Fonts.bold },
  postTime: { fontSize: 11, color: Colors.textMuted },
  postContent: { fontSize: 14, color: Colors.text, lineHeight: 20, fontFamily: Fonts.regular },
  postImage: { width: 160, height: 120, borderRadius: 8, marginRight: 8 },
  postActions: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  postAction: { fontSize: 13, color: Colors.textSecondary },

  // Meeting
  meetingCard: { marginHorizontal: 12, marginTop: 10, padding: 14, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#F0E0B0' },
  meetingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  meetingTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1, fontFamily: Fonts.bold },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { color: Colors.white, fontSize: 11, fontWeight: '700' },

  confirmedDate: { fontSize: 14, fontWeight: '600', color: Colors.green, marginBottom: 6 },
  confirmedLocation: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },

  // Shop Card
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.greenLight, borderWidth: 1, borderColor: Colors.greenBorder, borderRadius: 10, padding: 10, marginBottom: 10, position: 'relative' },
  shopImg: { width: 56, height: 56, borderRadius: 8, marginRight: 10 },
  shopInfo: { flex: 1 },
  shopNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  shopIcon: { fontSize: 14 },
  shopName: { fontSize: 14, fontWeight: '700', color: Colors.slate800 },
  shopRating: { fontSize: 12, fontWeight: '600', color: Colors.amber },
  shopAddress: { fontSize: 12, color: Colors.slate500, marginTop: 2 },
  shopMeta: { flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  shopOwner: { fontSize: 11, color: Colors.green, fontWeight: '600' },
  shopPhone: { fontSize: 11, color: Colors.slate500 },
  shopHours: { fontSize: 11, color: Colors.slate500 },
  shopBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.green, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  shopBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },

  // Vote Results
  voteResultsContainer: { backgroundColor: Colors.slate50, borderWidth: 1, borderColor: Colors.slate200, borderRadius: 10, padding: 12, marginBottom: 10 },
  voteResultsTitle: { fontSize: 14, fontWeight: '800', color: Colors.slate700, marginBottom: 10 },
  voteGroup: { marginBottom: 12 },
  voteGroupLabel: { fontSize: 11, color: Colors.slate400, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  voteRow: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200, borderRadius: 8, padding: 10, marginBottom: 6 },
  voteRowSelected: { backgroundColor: Colors.greenLight, borderColor: Colors.greenBorder },
  voteRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  voteCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.green, justifyContent: 'center', alignItems: 'center' },
  voteCheckText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  voteText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.slate700 },
  voteBadge: { minWidth: 36, alignItems: 'center', backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  voteBadgeZero: { backgroundColor: Colors.gray100 },
  voteBadgeText: { fontSize: 12, fontWeight: '800', color: '#2D5016' },
  voteBar: { height: 6, backgroundColor: Colors.slate100, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  voteBarFill: { height: 6, backgroundColor: '#93c5fd', borderRadius: 3 },
  voteBarSelected: { backgroundColor: '#4ade80' },
  voteNames: { fontSize: 11, color: Colors.slate400 },
  miniShopBadge: { backgroundColor: Colors.green, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  miniShopBadgeText: { color: Colors.white, fontSize: 8, fontWeight: '700' },

  // Attendees
  attendeesBox: { backgroundColor: '#E8F0E0', borderWidth: 1, borderColor: '#F0E0B0', borderRadius: 8, padding: 10, marginBottom: 10 },
  attendeesTitle: { fontSize: 12, fontWeight: '700', color: '#2D5016', marginBottom: 6 },
  attendeesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attendeeChip: { backgroundColor: Colors.white, borderWidth: 1, borderColor: '#93c5fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  attendeeText: { fontSize: 12, color: '#2D5016', fontWeight: '500' },
  noAttendees: { fontSize: 12, color: Colors.slate400 },

  // Vote Section (voting state)
  voteSection: { marginBottom: 12 },
  voteSectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.slate600, marginBottom: 6 },
  voteOption: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.gray50, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: Colors.gray200 },
  voteOptionVoted: { backgroundColor: Colors.primaryLight, borderColor: '#2D5016' },
  voteOptCheck: { color: '#2D5016', fontWeight: '700', marginRight: 6 },
  voteOptText: { flex: 1, fontSize: 13, color: Colors.text },
  voteOptCount: { fontSize: 13, fontWeight: '700', color: '#2D5016', marginLeft: 8 },
  voteShopInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  voteShopThumb: { width: 48, height: 48, borderRadius: 6 },
  voteShopName: { fontSize: 13, fontWeight: '700', color: Colors.slate800 },
  voteShopAddr: { fontSize: 11, color: Colors.slate500, marginTop: 1 },
  voteShopMeta: { fontSize: 11, color: Colors.slate400, marginTop: 1 },

  // Fee
  feeSummary: { margin: 12, padding: 14, backgroundColor: Colors.white, borderRadius: 12 },
  feeSummaryTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  feeSummaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  feeSummaryItem: { alignItems: 'center' },
  feeSummaryValue: { fontSize: 16, fontWeight: '800', color: Colors.text },
  feeSummaryLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  feeGroupCard: { marginHorizontal: 12, marginBottom: 10, padding: 14, backgroundColor: Colors.white, borderRadius: 12 },
  feeGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  feeGroupDesc: { fontSize: 14, fontWeight: '700', color: Colors.text },
  feeGroupAmount: { fontSize: 13, fontWeight: '600', color: '#2D5016' },
  feeGroupProgress: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  feeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  feeName: { fontSize: 13, color: Colors.text },
  feeStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Members
  inviteCodeBox: { margin: 12, padding: 14, backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amberBorder, borderRadius: 10, alignItems: 'center' },
  inviteCodeLabel: { fontSize: 12, color: Colors.gray600, marginBottom: 4 },
  inviteCode: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: 3, fontFamily: Fonts.bold },
  sectionBox: { margin: 12, padding: 14, backgroundColor: Colors.white, borderRadius: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10, fontFamily: Fonts.bold },
  requestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  requestName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  approveBtn: { backgroundColor: Colors.green, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  approveBtnText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  rejectBtn: { backgroundColor: Colors.gray200, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  rejectBtnText: { color: Colors.gray600, fontSize: 12, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  memberName: { fontSize: 14, fontWeight: '600', color: Colors.text, fontFamily: Fonts.bold },
  memberRole: { fontSize: 11, color: Colors.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 16, fontFamily: Fonts.bold },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray700, marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: Colors.gray300, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 4 },
  textArea: { borderWidth: 1, borderColor: Colors.gray300, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, marginBottom: 4 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.gray100 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.gray600 },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2D5016' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white, fontFamily: Fonts.bold },
  primaryBtn: { margin: 12, padding: 12, backgroundColor: '#2D5016', borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700', fontFamily: Fonts.bold },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  removeOption: { fontSize: 18, color: Colors.red, padding: 6 },
  addOption: { color: '#2D5016', fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 8 },

  // Shop Recommend
  shopRecommend: { marginTop: 12, backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amberBorder, borderRadius: 10, padding: 12 },
  shopRecommendTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 8 },
  shopRecommendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200, borderRadius: 8, padding: 8, marginBottom: 6 },
  shopRecommendImg: { width: 40, height: 40, borderRadius: 6 },
  shopRecommendPlaceholder: { width: 40, height: 40, borderRadius: 6, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
  shopRecommendName: { fontSize: 13, fontWeight: '700', color: Colors.slate800 },
  shopRecommendAddr: { fontSize: 11, color: Colors.slate500, marginTop: 1 },
  shopRecommendMeta: { fontSize: 11, color: Colors.slate400, marginTop: 1 },
  shopAddLabel: { fontSize: 11, fontWeight: '600', color: Colors.white, backgroundColor: Colors.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  shopAddedLabel: { fontSize: 11, fontWeight: '600', color: Colors.gray400, backgroundColor: Colors.gray200, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  // Cover image picker (multi)
  imageThumbWrap: { position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' },
  imageThumb: { width: 80, height: 80, borderRadius: 8 },
  repBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  repBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.white },
  imageRemoveBtn: { position: 'absolute', top: 2, right: 2 },
  coverPlaceholder: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray50, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', gap: 2 },
  coverPlaceholderText: { fontSize: 11, color: Colors.gray400, fontFamily: Fonts.regular },
  createPostHeader: {
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
  createPostHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  createPostSubmitBtn: {
    backgroundColor: '#FFE156',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 60,
    alignItems: 'center',
  },
  createPostSubmitText: {
    color: '#2D5016',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  createPostInput: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    minHeight: 200,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E0B0',
    paddingBottom: 12,
    fontFamily: Fonts.regular,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
});
