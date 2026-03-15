import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, Alert, Modal, ScrollView, Image, KeyboardAvoidingView, Platform,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { alumniShopAPI, ShopResponse, ShopReviewResponse, SHOP_CATEGORIES, MAIN_CATEGORIES, CATEGORY_ICONS } from '../api/alumniShop';
import { userAPI, ProfileResponse } from '../api/user';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import HeaderActions from '../components/HeaderActions';
import NoticeBanner from '../components/NoticeBanner';

type TabType = 'browse' | 'myShop';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function parseImageUrls(imageUrl?: string): string[] {
  if (!imageUrl) return [];
  return imageUrl.split(',').map(u => u.trim()).filter(Boolean);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function ImageGallery({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };
  if (images.length === 1) {
    return <Image source={{ uri: images[0] }} style={{ width: SCREEN_WIDTH, height: 220, resizeMode: 'cover' } as any} />;
  }
  return (
    <View style={styles.galleryContainer}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.galleryImage} />
        )}
      />
      <View style={styles.galleryCounter}>
        <Text style={styles.galleryCounterText}>{activeIndex + 1} / {images.length}</Text>
      </View>
      <View style={styles.galleryDots}>
        {images.map((_, i) => (
          <View key={i} style={[styles.galleryDot, i === activeIndex && styles.galleryDotActive]} />
        ))}
      </View>
    </View>
  );
}

export default function AlumniShopScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabType>('browse');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shops, setShops] = useState<ShopResponse[]>([]);
  const [myShops, setMyShops] = useState<ShopResponse[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopResponse | null>(null);
  const [reviews, setReviews] = useState<ShopReviewResponse[]>([]);

  // 낙서 스타일 Ionicons 매핑
  const CATEGORY_ICON_NAMES: Record<string, string> = {
    '음식점': 'restaurant-outline', '카페/디저트': 'cafe-outline', '주점/바': 'beer-outline', '뷰티/미용': 'cut-outline',
    '건강/의료': 'medkit-outline', '교육': 'pencil-outline', '생활서비스': 'hammer-outline', '쇼핑/유통': 'cart-outline',
    '자동차': 'car-outline', 'IT/전자': 'laptop-outline', '기타': 'bag-outline',
  };

  // Filters & Sort
  const [category, setCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(10);
  const [sortMode, setSortMode] = useState<'closeness' | 'reviews'>('closeness');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [myProfile, setMyProfile] = useState<ProfileResponse | null>(null);

  // Register form
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('음식점');
  const [shopSubCategory, setShopSubCategory] = useState('');
  const [shopDesc, setShopDesc] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopHours, setShopHours] = useState('');
  const [shopImageUris, setShopImageUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Edit mode (reuse register form fields)
  const [editingShopId, setEditingShopId] = useState<number | null>(null);

  // Review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');

  useEffect(() => { if (user) loadShops(); }, [user]);

  const loadShops = async () => {
    if (!user) return;
    try {
      const [s, ms, p] = await Promise.all([
        alumniShopAPI.getShops(user.userId),
        alumniShopAPI.getMyShops(user.userId),
        userAPI.getProfile(user.userId),
      ]);
      setShops(s);
      setMyShops(ms);
      setMyProfile(p);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 동창이네순 정렬: 같은 반 > 같은 학년 > 같은 학교
  const getClosenessScore = (shop: ShopResponse): number => {
    if (!myProfile || !shop.ownerSchoolDetails) return 0;
    let best = 0;
    for (const mySchool of myProfile.schools) {
      for (const ownerSchool of shop.ownerSchoolDetails) {
        if (mySchool.schoolName !== ownerSchool.schoolName) continue;
        // 같은 학교 = 1점
        let score = 1;
        // 같은 학년 = +2점
        if (mySchool.grade && ownerSchool.grade && mySchool.grade === ownerSchool.grade) {
          score += 2;
          // 같은 반 = +4점
          if (mySchool.classNumber && ownerSchool.classNumber && mySchool.classNumber === ownerSchool.classNumber) {
            score += 4;
          }
        }
        if (score > best) best = score;
      }
    }
    return best;
  };

  const loadShopDetail = async (shop: ShopResponse) => {
    setSelectedShop(shop);
    try {
      const r = await alumniShopAPI.getReviews(shop.id);
      setReviews(r);
    } catch {}
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      // 웹: input[type=file]로 이미지 선택
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setShopImageUris(prev => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setShopImageUris(prev => [...prev, result.assets[0].uri]);
      }
    }
  };

  const removeImage = (index: number) => {
    setShopImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegister = async () => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다');
      return;
    }
    if (!shopName.trim()) {
      Alert.alert('오류', '가게 이름을 입력해주세요');
      return;
    }
    if (!shopAddress.trim()) {
      Alert.alert('오류', '주소를 입력해주세요');
      return;
    }
    try {
      setUploading(true);
      let imageUrl: string | undefined;
      if (shopImageUris.length > 0) {
        try {
          const urls = await Promise.all(shopImageUris.map(uri => alumniShopAPI.uploadImage(uri)));
          imageUrl = urls.join(',');
        } catch (imgErr: any) {
          console.warn('이미지 업로드 실패, 이미지 없이 등록합니다:', imgErr?.message);
        }
      }
      const result = await alumniShopAPI.createShop(user.userId, {
        shopName: shopName.trim(),
        category: shopCategory,
        subCategory: shopSubCategory || undefined,
        description: shopDesc.trim() || undefined,
        address: shopAddress.trim(),
        phone: shopPhone.trim() || undefined,
        businessHours: shopHours.trim() || undefined,
        imageUrl,
      });
      console.log('가게 등록 성공:', result);
      Alert.alert('완료', '가게가 등록되었습니다!');
      setShopName(''); setShopDesc(''); setShopAddress(''); setShopPhone(''); setShopHours('');
      setShopSubCategory('');
      setShopImageUris([]);
      setShowRegisterForm(false);
      loadShops();
    } catch (e: any) {
      console.error('가게 등록 실패:', e?.response?.status, e?.response?.data, e?.message);
      Alert.alert('등록 실패', e?.response?.data?.error || e?.message || '서버 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (shop: ShopResponse) => {
    setEditingShopId(shop.id);
    setShopName(shop.shopName);
    setShopCategory(shop.category);
    setShopSubCategory(shop.subCategory || '');
    setShopDesc(shop.description || '');
    setShopAddress(shop.address);
    setShopPhone(shop.phone || '');
    setShopHours(shop.businessHours || '');
    setShopImageUris(parseImageUrls(shop.imageUrl));
  };

  const cancelEdit = () => {
    setEditingShopId(null);
    setShopName(''); setShopDesc(''); setShopAddress(''); setShopPhone(''); setShopHours('');
    setShopSubCategory(''); setShopCategory('음식점');
    setShopImageUris([]);
  };

  const handleUpdate = async () => {
    if (!user || !editingShopId) return;
    if (!shopName.trim()) { Alert.alert('오류', '가게 이름을 입력해주세요'); return; }
    if (!shopAddress.trim()) { Alert.alert('오류', '주소를 입력해주세요'); return; }
    try {
      setUploading(true);
      // 새 로컬 이미지만 업로드, 기존 URL은 유지
      const finalUrls: string[] = [];
      for (const uri of shopImageUris) {
        if (uri.startsWith('http')) {
          finalUrls.push(uri);
        } else {
          try {
            const uploaded = await alumniShopAPI.uploadImage(uri);
            finalUrls.push(uploaded);
          } catch { /* skip failed */ }
        }
      }
      const imageUrl = finalUrls.length > 0 ? finalUrls.join(',') : undefined;
      await alumniShopAPI.updateShop(editingShopId, user.userId, {
        shopName: shopName.trim(),
        category: shopCategory,
        subCategory: shopSubCategory || undefined,
        description: shopDesc.trim() || undefined,
        address: shopAddress.trim(),
        phone: shopPhone.trim() || undefined,
        businessHours: shopHours.trim() || undefined,
        imageUrl,
      });
      Alert.alert('완료', '가게 정보가 수정되었습니다!');
      cancelEdit();
      setSelectedShop(null);
      loadShops();
    } catch (e: any) {
      Alert.alert('수정 실패', e?.response?.data?.error || e?.message || '서버 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteShop = (shopId: number) => {
    Alert.alert('가게 삭제', '정말 이 가게를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await alumniShopAPI.deleteShop(shopId, user!.userId);
          Alert.alert('완료', '가게가 삭제되었습니다');
          setSelectedShop(null);
          loadShops();
        } catch (e: any) {
          Alert.alert('오류', e?.response?.data?.error || '삭제 실패');
        }
      }},
    ]);
  };

  const handleAddReview = async () => {
    if (!user || !selectedShop || !reviewContent.trim()) return;
    try {
      await alumniShopAPI.addReview(selectedShop.id, user.userId, reviewRating, reviewContent.trim());
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewContent('');
      const r = await alumniShopAPI.getReviews(selectedShop.id);
      setReviews(r);
      Alert.alert('완료', '후기가 등록되었습니다!');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error || '후기 등록 실패');
    }
  };

  const filteredShops = shops
    .filter(s => {
      if (category !== '전체' && s.category !== category) return false;
      if (search && !s.shopName.includes(search) && !s.address.includes(search)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'closeness') return getClosenessScore(b) - getClosenessScore(a);
      if (sortMode === 'reviews') return (b.reviewCount || 0) - (a.reviewCount || 0);
      return 0;
    });
  const displayedShops = filteredShops.slice(0, displayCount);
  const hasMore = filteredShops.length > displayCount;

  const SORT_OPTIONS: { key: typeof sortMode; label: string }[] = [
    { key: 'closeness', label: '동창이네순' },
    { key: 'reviews', label: '후기순' },
  ];

  if (loading) return <LoadingScreen message="동창이네 로딩 중..." />;

  // Shop Detail
  if (selectedShop) {
    const detailImages = parseImageUrls(selectedShop.imageUrl);
    const isOwner = user && selectedShop.ownerUserId === user.userId;
    const isEditing = editingShopId === selectedShop.id;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedShop(null); cancelEdit(); }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFE156" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{isEditing ? '가게 수정' : selectedShop.shopName}</Text>
        </View>

        {isEditing ? (
          /* ── 수정 폼 ── */
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={styles.inputLabel}>사진 (첫 번째가 대표 사진)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
              {shopImageUris.map((uri, idx) => (
                <View key={idx} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                  {idx === 0 && <View style={styles.repBadge}><Text style={styles.repBadgeText}>대표</Text></View>}
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeImage(idx)}>
                    <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.imageAddBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={28} color={Colors.gray400} />
                <Text style={styles.imagePickerText}>추가</Text>
              </TouchableOpacity>
            </ScrollView>

            <Text style={styles.inputLabel}>가게 이름 *</Text>
            <TextInput style={styles.input} placeholder="가게 이름" value={shopName} onChangeText={setShopName} />

            <Text style={styles.inputLabel}>업종 *</Text>
            <View style={[styles.categoryWrap, { paddingHorizontal: 0, marginBottom: 8 }]}>
              {MAIN_CATEGORIES.map(c => {
                const icon = CATEGORY_ICON_NAMES[c] || 'storefront-outline';
                return (
                  <TouchableOpacity key={c} style={[styles.categoryChip, shopCategory === c && styles.categoryChipActive]} onPress={() => { setShopCategory(c); setShopSubCategory(''); }}>
                    <View style={[styles.categoryIconCircle, shopCategory === c && styles.categoryIconCircleActive]}>
                      <Ionicons name={icon as any} size={20} color={shopCategory === c ? '#fff' : '#5D4037'} />
                    </View>
                    <Text style={[styles.categoryChipText, shopCategory === c && styles.categoryChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {SHOP_CATEGORIES[shopCategory] && (
              <View style={[styles.categoryWrap, { paddingHorizontal: 0, marginBottom: 8 }]}>
                {SHOP_CATEGORIES[shopCategory].map(sc => (
                  <TouchableOpacity key={sc} style={[styles.categoryChip, shopSubCategory === sc && styles.categoryChipActive]} onPress={() => setShopSubCategory(sc)}>
                    <Text style={[styles.categoryChipText, shopSubCategory === sc && styles.categoryChipTextActive]}>{sc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>주소 *</Text>
            <TextInput style={styles.input} placeholder="서울시 강남구..." value={shopAddress} onChangeText={setShopAddress} />

            <Text style={styles.inputLabel}>전화번호</Text>
            <TextInput style={styles.input} placeholder="02-1234-5678" value={shopPhone} onChangeText={setShopPhone} keyboardType="phone-pad" />

            <Text style={styles.inputLabel}>영업시간</Text>
            <TextInput style={styles.input} placeholder="매일 09:00~22:00" value={shopHours} onChangeText={setShopHours} />

            <Text style={styles.inputLabel}>설명</Text>
            <TextInput style={styles.textArea} placeholder="가게 소개" value={shopDesc} onChangeText={setShopDesc} multiline textAlignVertical="top" />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.registerBtn, { flex: 1, backgroundColor: Colors.gray200, marginHorizontal: 0, marginBottom: 0, marginTop: 0 }]} onPress={cancelEdit}>
                <Text style={[styles.registerBtnText, { color: '#5D4037' }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.registerBtn, { flex: 2, marginHorizontal: 0, marginBottom: 0, marginTop: 0, opacity: uploading ? 0.6 : 1 }]} onPress={handleUpdate} disabled={uploading}>
                <Text style={styles.registerBtnText}>{uploading ? '수정 중...' : '수정 완료'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* ── 상세 보기 ── */
          <ScrollView>
            {detailImages.length > 0 && (
              <ImageGallery images={detailImages} />
            )}
            <View style={styles.detailBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[selectedShop.category] || '🏪'}</Text>
                <Text style={styles.detailName}>{selectedShop.shopName}</Text>
                {selectedShop.averageRating != null && (
                  <Text style={styles.detailRating}>★ {selectedShop.averageRating.toFixed(1)}</Text>
                )}
              </View>
              <Text style={styles.detailCategory}>{selectedShop.category} {selectedShop.subCategory ? `> ${selectedShop.subCategory}` : ''}</Text>
              <Text style={styles.detailAddress}>📍 {selectedShop.address}{selectedShop.detailAddress ? ` ${selectedShop.detailAddress}` : ''}</Text>
              {selectedShop.phone && <Text style={styles.detailPhone}>📞 {selectedShop.phone}</Text>}
              {selectedShop.businessHours && <Text style={styles.detailHours}>🕐 {selectedShop.businessHours}</Text>}
              {selectedShop.description && <Text style={styles.detailDesc}>{selectedShop.description}</Text>}
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerLabel}>사장</Text>
                <Text style={styles.ownerName}>{selectedShop.ownerName}</Text>
                {selectedShop.ownerSchools.length > 0 && (
                  <Text style={styles.ownerSchool}>{selectedShop.ownerSchools.join(', ')}</Text>
                )}
              </View>

              {/* 내 가게일 때 수정/삭제 버튼 */}
              {isOwner && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0E0B0' }}>
                  <TouchableOpacity style={[styles.registerBtn, { flex: 1, marginHorizontal: 0, marginBottom: 0, marginTop: 0, paddingVertical: 10 }]} onPress={() => startEdit(selectedShop)}>
                    <Text style={[styles.registerBtnText, { fontSize: 14 }]}>수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.registerBtn, { flex: 1, marginHorizontal: 0, marginBottom: 0, marginTop: 0, paddingVertical: 10, backgroundColor: '#DC2626' }]} onPress={() => handleDeleteShop(selectedShop.id)}>
                    <Text style={[styles.registerBtnText, { fontSize: 14 }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Reviews */}
            <View style={styles.reviewSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.reviewTitle}>후기 ({reviews.length})</Text>
                <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)}>
                  <Text style={styles.writeReviewText}>후기 작성</Text>
                </TouchableOpacity>
              </View>
              {reviews.length === 0 && <Text style={styles.noReviews}>아직 후기가 없습니다</Text>}
              {reviews.map(r => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Avatar uri={r.reviewerProfileImageUrl} name={r.reviewerName} size={32} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={styles.reviewerName}>{r.reviewerName}</Text>
                      <Text style={styles.reviewTime}>{timeAgo(r.createdAt)}</Text>
                    </View>
                    <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                  </View>
                  {r.content && <Text style={styles.reviewContent}>{r.content}</Text>}
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Review Modal */}
        <Modal visible={showReviewModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
              <Text style={styles.modalTitle}>후기 작성</Text>
              <Text style={styles.inputLabel}>별점</Text>
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                    <Text style={[styles.star, s <= reviewRating && styles.starActive]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>내용</Text>
              <TextInput style={styles.textArea} placeholder="솔직한 후기를 남겨주세요" value={reviewContent} onChangeText={setReviewContent} multiline maxLength={500} textAlignVertical="top" />
              <Text style={styles.charCount}>{reviewContent.length}/500</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReviewModal(false)}><Text style={styles.cancelBtnText}>취소</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleAddReview}><Text style={styles.submitBtnText}>등록</Text></TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="storefront" size={33} color="#fff" style={{ marginTop: -3 }} />
          <Text style={styles.screenHeaderTitle}>동창이네</Text>
        </View>
        <HeaderActions navigation={navigation} />
      </View>
      <NoticeBanner />
      {/* Header Tabs */}
      <View style={styles.headerTabs}>
        {([['browse', '둘러보기'], ['myShop', '내 가게']] as [TabType, string][]).map(([t, label]) => (
          <TouchableOpacity key={t} style={[styles.headerTab, tab === t && styles.headerTabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.headerTabText, tab === t && styles.headerTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Browse Tab */}
      {tab === 'browse' && (
        <View style={{ flex: 1 }}>
          <FlatList
            ListHeaderComponent={
              <>
                {/* Search */}
                <View style={styles.searchRow}>
                  <TextInput style={styles.searchInput} placeholder="가게명, 주소 검색" value={search} onChangeText={(t) => { setSearch(t); setDisplayCount(10); }} />
                  <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
                    <Ionicons name="filter" size={16} color={'#2D5016'} />
                    <Text style={styles.sortBtnText}>{SORT_OPTIONS.find(o => o.key === sortMode)?.label}</Text>
                    <Ionicons name={showSortMenu ? 'chevron-up' : 'chevron-down'} size={14} color={'#2D5016'} />
                  </TouchableOpacity>
                </View>
                {showSortMenu && (
                  <View style={styles.sortMenu}>
                    {SORT_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.sortMenuItem, sortMode === opt.key && styles.sortMenuItemActive]}
                        onPress={() => { setSortMode(opt.key); setShowSortMenu(false); setDisplayCount(10); }}
                      >
                        <Text style={[styles.sortMenuText, sortMode === opt.key && styles.sortMenuTextActive]}>{opt.label}</Text>
                        {sortMode === opt.key && <Ionicons name="checkmark" size={16} color={'#2D5016'} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {/* Category Filter */}
                <View style={styles.categoryWrap}>
                  <TouchableOpacity style={[styles.categoryChip, category === '전체' && styles.categoryChipActive]} onPress={() => { setCategory('전체'); setDisplayCount(10); }}>
                    <View style={[styles.categoryIconCircle, category === '전체' && styles.categoryIconCircleActive]}>
                      <Ionicons name="grid-outline" size={16} color={category === '전체' ? '#fff' : '#5D4037'} />
                    </View>
                    <Text style={[styles.categoryChipText, category === '전체' && styles.categoryChipTextActive]}>전체</Text>
                  </TouchableOpacity>
                  {MAIN_CATEGORIES.map(c => {
                    const icon = CATEGORY_ICON_NAMES[c] || 'storefront-outline';
                    return (
                      <TouchableOpacity key={c} style={[styles.categoryChip, category === c && styles.categoryChipActive]} onPress={() => { setCategory(c); setDisplayCount(10); }}>
                        <View style={[styles.categoryIconCircle, category === c && styles.categoryIconCircleActive]}>
                          <Ionicons name={icon as any} size={16} color={category === c ? '#fff' : '#5D4037'} />
                        </View>
                        <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            }
            data={displayedShops}
            keyExtractor={item => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setDisplayCount(10); loadShops(); }} />}
            ListEmptyComponent={<EmptyState ionIcon="storefront-outline" title="등록된 가게가 없습니다" />}
            ListFooterComponent={hasMore ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setDisplayCount(prev => prev + 10)}>
                <Text style={styles.loadMoreText}>+ 더보기 ({filteredShops.length - displayCount}개 남음)</Text>
              </TouchableOpacity>
            ) : null}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.shopCard} onPress={() => loadShopDetail(item)}>
                {item.imageUrl ? (
                  <Image source={{ uri: parseImageUrls(item.imageUrl)[0] }} style={styles.shopCardImg} />
                ) : (
                  <View style={[styles.shopCardImg, { backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 24 }}>{CATEGORY_ICONS[item.category] || '🏪'}</Text>
                  </View>
                )}
                <View style={styles.shopCardInfo}>
                  <Text style={styles.shopCardName}>{item.shopName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    {item.averageRating != null && <Text style={styles.shopCardRating}>★ {item.averageRating.toFixed(1)}</Text>}
                    <Text style={styles.shopCardReviews}>후기 {item.reviewCount}</Text>
                  </View>
                  <Text style={styles.shopCardAddr} numberOfLines={1}>{item.address}</Text>
                  <Text style={styles.shopCardOwner}>{item.ownerName} 사장</Text>
                  {item.ownerSchools && item.ownerSchools.length > 0 && (
                    <Text style={styles.shopCardSchool} numberOfLines={1}>{item.ownerSchools.join(', ')}</Text>
                  )}
                </View>
                <View style={styles.shopCardBadge}><Text style={styles.shopCardBadgeText}>동창이네</Text></View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* My Shop Tab */}
      {tab === 'myShop' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* 내 가게 목록 */}
          {myShops.length > 0 ? (
            myShops.map(item => (
              <TouchableOpacity key={item.id} style={styles.shopCard} onPress={() => loadShopDetail(item)}>
                {item.imageUrl ? (
                  <Image source={{ uri: parseImageUrls(item.imageUrl)[0] }} style={styles.shopCardImg} />
                ) : (
                  <View style={[styles.shopCardImg, { backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 24 }}>{CATEGORY_ICONS[item.category] || '🏪'}</Text>
                  </View>
                )}
                <View style={styles.shopCardInfo}>
                  <Text style={styles.shopCardName}>{item.shopName}</Text>
                  <Text style={styles.shopCardAddr}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState ionIcon="storefront-outline" title="등록한 가게가 없습니다" subtitle="아래에서 가게를 등록하세요" />
          )}

          {/* 등록 폼 토글 */}
          {!showRegisterForm ? (
            <TouchableOpacity style={styles.registerBtn} onPress={() => setShowRegisterForm(true)}>
              <Text style={styles.registerBtnText}>+ 새 가게 등록</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text }}>새 가게 등록</Text>
                <TouchableOpacity onPress={() => setShowRegisterForm(false)}>
                  <Text style={{ fontSize: 13, color: Colors.gray400 }}>닫기</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>사진 (첫 번째가 대표 사진)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {shopImageUris.map((uri, idx) => (
                  <View key={idx} style={styles.imageThumbWrap}>
                    <Image source={{ uri }} style={styles.imageThumb} />
                    {idx === 0 && (
                      <View style={styles.repBadge}><Text style={styles.repBadgeText}>대표</Text></View>
                    )}
                    <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeImage(idx)}>
                      <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.imageAddBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={28} color={Colors.gray400} />
                  <Text style={styles.imagePickerText}>추가</Text>
                </TouchableOpacity>
              </ScrollView>

              <Text style={styles.inputLabel}>가게 이름 *</Text>
              <TextInput style={styles.input} placeholder="가게 이름" value={shopName} onChangeText={setShopName} />

              <Text style={styles.inputLabel}>업종 *</Text>
              <View style={[styles.categoryWrap, { paddingHorizontal: 0, marginBottom: 8 }]}>
                {MAIN_CATEGORIES.map(c => {
                  const icon = CATEGORY_ICON_NAMES[c] || 'storefront-outline';
                  return (
                    <TouchableOpacity key={c} style={[styles.categoryChip, shopCategory === c && styles.categoryChipActive]} onPress={() => { setShopCategory(c); setShopSubCategory(''); }}>
                      <View style={[styles.categoryIconCircle, shopCategory === c && styles.categoryIconCircleActive]}>
                        <Ionicons name={icon as any} size={20} color={shopCategory === c ? '#fff' : '#5D4037'} />
                      </View>
                      <Text style={[styles.categoryChipText, shopCategory === c && styles.categoryChipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {SHOP_CATEGORIES[shopCategory] && (
                <View style={[styles.categoryWrap, { paddingHorizontal: 0, marginBottom: 8 }]}>
                  {SHOP_CATEGORIES[shopCategory].map(sc => (
                    <TouchableOpacity key={sc} style={[styles.categoryChip, shopSubCategory === sc && styles.categoryChipActive]} onPress={() => setShopSubCategory(sc)}>
                      <Text style={[styles.categoryChipText, shopSubCategory === sc && styles.categoryChipTextActive]}>{sc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>주소 *</Text>
              <TextInput style={styles.input} placeholder="서울시 강남구..." value={shopAddress} onChangeText={setShopAddress} />

              <Text style={styles.inputLabel}>전화번호</Text>
              <TextInput style={styles.input} placeholder="02-1234-5678" value={shopPhone} onChangeText={setShopPhone} keyboardType="phone-pad" />

              <Text style={styles.inputLabel}>영업시간</Text>
              <TextInput style={styles.input} placeholder="매일 09:00~22:00" value={shopHours} onChangeText={setShopHours} />

              <Text style={styles.inputLabel}>설명</Text>
              <TextInput style={styles.textArea} placeholder="가게 소개" value={shopDesc} onChangeText={setShopDesc} multiline textAlignVertical="top" />

              <TouchableOpacity style={[styles.registerBtn, uploading && { opacity: 0.6 }]} onPress={handleRegister} disabled={uploading}>
                <Text style={styles.registerBtnText}>{uploading ? '등록 중...' : '가게 등록'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2D5016', paddingTop: HEADER_TOP_PADDING, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: '#C49A2A' },
  screenHeaderTitle: { fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold, letterSpacing: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, paddingTop: HEADER_TOP_PADDING, backgroundColor: '#2D5016', borderBottomWidth: 3, borderBottomColor: '#C49A2A', gap: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backBtnText: { fontSize: 13, color: '#FFE156', fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold, letterSpacing: 2 },

  headerTabs: { flexDirection: 'row', backgroundColor: '#FFF8E7', borderBottomWidth: 1, borderBottomColor: '#F0E0B0' },
  headerTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  headerTabActive: { borderBottomWidth: 2, borderBottomColor: '#2D5016' },
  headerTabText: { fontSize: 14, fontWeight: '600', color: Colors.gray400, fontFamily: Fonts.bold },
  headerTabTextActive: { color: '#2D5016' },

  searchRow: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF8E7', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: Colors.gray50, borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: Colors.gray200 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#2D5016' + '40', backgroundColor: '#2D5016' + '08' },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: '#2D5016' },
  sortMenu: { backgroundColor: Colors.white, marginHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.gray200, marginBottom: 4 },
  sortMenuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  sortMenuItemActive: { backgroundColor: '#2D5016' + '08' },
  sortMenuText: { fontSize: 13, fontWeight: '500', color: '#5D4037' },
  sortMenuTextActive: { fontWeight: '700', color: '#2D5016' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 4, paddingBottom: 6, backgroundColor: '#FFF8E7', gap: 4 },
  categoryChip: { alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingVertical: 3 },
  categoryChipActive: {},
  categoryIconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#F0E0B0', backgroundColor: '#FFF8E7' },
  categoryIconCircleActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  categoryChipText: { fontSize: 10, fontWeight: '600', color: '#5D4037' },
  categoryChipTextActive: { color: '#2D5016', fontWeight: '700' },

  shopCard: { flexDirection: 'row', backgroundColor: '#ffffff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#F0E0B0' },
  shopCardImg: { width: 80, height: 80 },
  shopCardInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  shopCardName: { fontSize: 15, fontWeight: '700', color: '#5D4037', fontFamily: Fonts.bold },
  shopCardRating: { fontSize: 12, fontWeight: '600', color: '#F5A623'},
  shopCardReviews: { fontSize: 11, color: Colors.textMuted },
  shopCardAddr: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  shopCardOwner: { fontSize: 11, color: '#2D5016', fontWeight: '600', marginTop: 2 },
  shopCardSchool: { fontSize: 10, color: Colors.gray400, marginTop: 1 },
  shopCardBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#2D5016', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  shopCardBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },

  // Detail
  detailBox: { padding: 16, backgroundColor: '#ffffff' },
  detailName: { fontSize: 20, fontWeight: '800', color: '#5D4037', fontFamily: Fonts.bold },
  detailRating: { fontSize: 16, fontWeight: '700', color: '#F5A623'},
  detailCategory: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  detailAddress: { fontSize: 14, color: Colors.text, marginBottom: 4, fontFamily: Fonts.regular },
  detailPhone: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  detailHours: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  detailDesc: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, fontFamily: Fonts.regular },
  ownerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  ownerLabel: { fontSize: 12, color: Colors.textMuted },
  ownerName: { fontSize: 14, fontWeight: '700', color: '#2D5016', fontFamily: Fonts.bold },
  ownerSchool: { fontSize: 12, color: Colors.textSecondary },

  // Reviews
  reviewSection: { padding: 16 },
  reviewTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, fontFamily: Fonts.bold },
  writeReviewBtn: { backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amberBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  writeReviewText: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  noReviews: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  reviewCard: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F0E0B0' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  reviewTime: { fontSize: 11, color: Colors.textMuted },
  reviewStars: { fontSize: 14, color: '#F5A623' },
  reviewContent: { fontSize: 13, color: Colors.text, lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 16, fontFamily: Fonts.bold },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray700, marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#F0E0B0', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 4, backgroundColor: '#ffffff' },
  textArea: { borderWidth: 1, borderColor: '#F0E0B0', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, marginBottom: 4, backgroundColor: '#ffffff' },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  starPicker: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  star: { fontSize: 30, color: Colors.gray300 },
  starActive: { color: '#F5A623' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.gray100 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.gray600 },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2D5016' },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: Colors.white, fontFamily: Fonts.bold },
  imageThumbWrap: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  imageThumb: { width: 100, height: 100, resizeMode: 'cover' },
  repBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: '#2D5016', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  repBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  imageRemoveBtn: { position: 'absolute', top: 2, right: 2 },
  imageAddBtn: { width: 100, height: 100, borderRadius: 10, borderWidth: 1, borderColor: Colors.gray200, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray50, gap: 4 },
  imagePickerText: { fontSize: 11, color: Colors.gray400, fontWeight: '500' },
  galleryContainer: { position: 'relative' },
  galleryImage: { width: SCREEN_WIDTH, height: 220, resizeMode: 'cover' },
  galleryDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  galleryDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.gray300 },
  galleryDotActive: { backgroundColor: '#2D5016', width: 18 },
  galleryCounter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  galleryCounterText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  registerBtn: { backgroundColor: '#2D5016', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16, marginBottom: 40, marginHorizontal: 16 },
  registerBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700', fontFamily: Fonts.bold },
  loadMoreBtn: { margin: 16, padding: 14, backgroundColor: Colors.white, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.gray200 },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#2D5016' },
});
