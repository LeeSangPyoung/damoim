import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList,
  Alert, RefreshControl, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { userAPI, ProfileResponse, SchoolUpdateInfo } from '../api/user';
import { friendAPI, FriendshipStatus } from '../api/friend';
import { schoolAPI, SchoolSearchResult } from '../api/school';
import { chatAPI } from '../api/chat';
import Avatar from '../components/Avatar';
import LoadingScreen from '../components/LoadingScreen';

// ===== Types & Helpers =====
interface GradeClass { id: number; grade: string; classNumber: string; }

interface EditableSchool {
  id: number; schoolCode: string; schoolType: string;
  schoolName: string; graduationYear: string; gradeClasses: GradeClass[];
}

interface SameSchoolMatch {
  schoolName: string; graduationYear: string; grade: string; classNumber: string;
}

function groupSchools(profileSchools: ProfileResponse['schools']): EditableSchool[] {
  const map = new Map<string, EditableSchool>();
  let schoolId = 1, gcId = 1;
  for (const s of profileSchools) {
    const key = `${s.schoolType}|${s.schoolName}|${s.graduationYear}`;
    if (map.has(key)) {
      const existing = map.get(key)!;
      if (s.grade || s.classNumber) existing.gradeClasses.push({ id: gcId++, grade: s.grade || '', classNumber: s.classNumber || '' });
    } else {
      const gradeClasses: GradeClass[] = [];
      if (s.grade || s.classNumber) gradeClasses.push({ id: gcId++, grade: s.grade || '', classNumber: s.classNumber || '' });
      else gradeClasses.push({ id: gcId++, grade: '', classNumber: '' });
      map.set(key, { id: schoolId++, schoolCode: s.schoolCode || '', schoolType: s.schoolType, schoolName: s.schoolName, graduationYear: s.graduationYear, gradeClasses });
    }
  }
  return Array.from(map.values());
}

function getGradeOptions(schoolType: string): number[] {
  switch (schoolType) {
    case '초등학교': return [1, 2, 3, 4, 5, 6];
    case '중학교': case '고등학교': return [1, 2, 3];
    case '대학교': return [1, 2, 3, 4, 5, 6];
    default: return [1, 2, 3, 4, 5, 6];
  }
}

const SCHOOL_TYPES = ['초등학교', '중학교', '고등학교', '대학교'];

// ===== Component =====
export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, logout } = useAuth();
  const targetUserId = route.params?.userId as string | undefined;
  const isOwnProfile = !targetUserId || targetUserId === user?.userId;
  const viewUserId = targetUserId || user?.userId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus | null>(null);
  const [sameSchools, setSameSchools] = useState<SameSchoolMatch[]>([]);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editSchools, setEditSchools] = useState<EditableSchool[]>([]);

  // School search
  const [schoolSearchResults, setSchoolSearchResults] = useState<SchoolSearchResult[]>([]);
  const [schoolSearchLoading, setSchoolSearchLoading] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Year picker
  const [yearPickerSchoolId, setYearPickerSchoolId] = useState<number | null>(null);
  const GRADUATION_YEARS = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i);

  // Grade picker
  const [gradePickerTarget, setGradePickerTarget] = useState<{ schoolId: number; gcId: number; schoolType: string } | null>(null);

  useEffect(() => { if (viewUserId) loadProfile(); }, [viewUserId]);

  const loadProfile = async () => {
    if (!viewUserId) return;
    try {
      const p = await userAPI.getProfile(viewUserId);
      setProfile(p);

      if (!isOwnProfile && user && viewUserId) {
        // 친구 상태
        try { setFriendStatus(await friendAPI.getStatus(user.userId, viewUserId)); } catch {}
        // 같은 반 매칭
        try {
          const myProfile = await userAPI.getProfile(user.userId);
          const matches: SameSchoolMatch[] = [];
          for (const my of myProfile.schools) {
            for (const their of p.schools) {
              if (my.schoolName === their.schoolName && my.graduationYear === their.graduationYear
                && my.grade && their.grade && my.grade === their.grade
                && my.classNumber && their.classNumber && my.classNumber === their.classNumber) {
                matches.push({ schoolName: my.schoolName, graduationYear: my.graduationYear, grade: my.grade, classNumber: my.classNumber });
              }
            }
          }
          setSameSchools(matches);
        } catch {}
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ===== Friend handlers =====
  const handleRemoveFriend = async () => {
    if (!user || !friendStatus?.friendshipId) return;
    const doRemove = async () => {
      try { await friendAPI.removeFriendship(friendStatus.friendshipId!, user.userId); setFriendStatus({ status: 'NONE' }); }
      catch { Alert.alert('오류', '친구 삭제에 실패했습니다.'); }
    };
    if (Platform.OS === 'web') { if (window.confirm('이 친구를 삭제하시겠습니까?')) doRemove(); }
    else Alert.alert('친구 삭제', '이 친구를 삭제하시겠습니까?', [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: doRemove }]);
  };

  const handleSendFriendRequest = async () => {
    if (!user || !viewUserId) return;
    try { await friendAPI.sendRequest(user.userId, viewUserId); setFriendStatus({ status: 'SENT' }); Alert.alert('완료', '친구 요청을 보냈습니다'); }
    catch (e: any) { Alert.alert('오류', e?.response?.data?.error || '요청 실패'); }
  };

  const handleAcceptFriendRequest = async () => {
    if (!user || !friendStatus?.friendshipId) return;
    try { await friendAPI.acceptRequest(friendStatus.friendshipId, user.userId); setFriendStatus({ status: 'FRIEND', friendshipId: friendStatus.friendshipId }); }
    catch {}
  };

  // ===== Edit handlers =====
  const openEditModal = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditBio(profile.bio || '');
    setEditImageUrl(profile.profileImageUrl || '');
    setEditSchools(groupSchools(profile.schools));
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editName.trim()) { Alert.alert('오류', '이름은 필수 항목입니다.'); return; }
    const validSchools = editSchools.filter(s => s.schoolType && s.schoolName && s.graduationYear);
    if (validSchools.length === 0) { Alert.alert('오류', '최소 1개 이상의 학교 정보를 입력해주세요.'); return; }

    const schoolsData: SchoolUpdateInfo[] = [];
    for (const school of validSchools) {
      const validGCs = school.gradeClasses.filter(gc => gc.grade || gc.classNumber);
      if (validGCs.length === 0) {
        schoolsData.push({ schoolCode: school.schoolCode || undefined, schoolType: school.schoolType, schoolName: school.schoolName, graduationYear: school.graduationYear });
      } else {
        for (const gc of validGCs) {
          schoolsData.push({ schoolCode: school.schoolCode || undefined, schoolType: school.schoolType, schoolName: school.schoolName, graduationYear: school.graduationYear, grade: gc.grade || undefined, classNumber: gc.classNumber || undefined });
        }
      }
    }

    try {
      setSaving(true);
      const updated = await userAPI.updateProfile(user.userId, { name: editName.trim(), bio: editBio.trim() || undefined, profileImageUrl: editImageUrl.trim() || undefined, schools: schoolsData });
      setProfile(updated);
      setShowEditModal(false);
      Alert.alert('완료', '프로필이 수정되었습니다');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error || '프로필 수정에 실패했습니다.');
    } finally { setSaving(false); }
  };

  // School edit helpers
  const addSchool = () => {
    const newId = editSchools.length > 0 ? Math.max(...editSchools.map(s => s.id)) + 1 : 1;
    setEditSchools(prev => [...prev, { id: newId, schoolCode: '', schoolType: '', schoolName: '', graduationYear: '', gradeClasses: [{ id: 1, grade: '', classNumber: '' }] }]);
  };

  const removeSchool = (id: number) => {
    if (editSchools.length <= 1) { Alert.alert('알림', '최소 1개 학교는 필요합니다.'); return; }
    setEditSchools(prev => prev.filter(s => s.id !== id));
  };

  const updateSchoolField = (schoolId: number, field: string, value: string) => {
    setEditSchools(prev => prev.map(s => {
      if (s.id !== schoolId) return s;
      const updated = { ...s, [field]: value };
      if (field === 'schoolType') { updated.schoolCode = ''; updated.schoolName = ''; }
      return updated;
    }));
  };

  const addGradeClass = (schoolId: number) => {
    setEditSchools(prev => prev.map(s => {
      if (s.id !== schoolId) return s;
      const newId = Math.max(...s.gradeClasses.map(gc => gc.id)) + 1;
      return { ...s, gradeClasses: [...s.gradeClasses, { id: newId, grade: '', classNumber: '' }] };
    }));
  };

  const removeGradeClass = (schoolId: number, gcId: number) => {
    setEditSchools(prev => prev.map(s => {
      if (s.id !== schoolId || s.gradeClasses.length <= 1) return s;
      return { ...s, gradeClasses: s.gradeClasses.filter(gc => gc.id !== gcId) };
    }));
  };

  const updateGradeClass = (schoolId: number, gcId: number, field: 'grade' | 'classNumber', value: string) => {
    setEditSchools(prev => prev.map(s => {
      if (s.id !== schoolId) return s;
      return { ...s, gradeClasses: s.gradeClasses.map(gc => gc.id === gcId ? { ...gc, [field]: value } : gc) };
    }));
  };

  const handleSchoolSearch = useCallback(async (query: string, schoolType: string) => {
    if (query.trim().length < 2) { setSchoolSearchResults([]); return; }
    setSchoolSearchLoading(true);
    try { setSchoolSearchResults(await schoolAPI.search(query, schoolType || undefined)); }
    catch { setSchoolSearchResults([]); }
    finally { setSchoolSearchLoading(false); }
  }, []);

  const onSchoolNameChange = (schoolId: number, text: string) => {
    updateSchoolField(schoolId, 'schoolName', text);
    setEditingSchoolId(schoolId);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const school = editSchools.find(s => s.id === schoolId);
    searchDebounceRef.current = setTimeout(() => handleSchoolSearch(text, school?.schoolType || ''), 300);
  };

  const selectSchoolResult = (schoolId: number, result: SchoolSearchResult) => {
    setEditSchools(prev => prev.map(s => s.id !== schoolId ? s : { ...s, schoolCode: result.schoolCode, schoolName: result.schoolName }));
    setEditingSchoolId(null);
    setSchoolSearchResults([]);
  };

  if (loading) return <LoadingScreen message="프로필 로딩 중..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFE156" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwnProfile ? '내 프로필' : profile?.name || '프로필'}</Text>
        {isOwnProfile ? (
          <TouchableOpacity onPress={openEditModal} style={styles.backBtn}>
            <Ionicons name="create-outline" size={22} color="#FFE156" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      {profile && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ===== 1. 프로필 카드 (컴팩트) ===== */}
          <View style={styles.profileCard}>
            <Avatar uri={profile.profileImageUrl} name={profile.name} size={56} />
            <View style={styles.profileInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <View style={[styles.onlineBadge, !profile.online && styles.offlineBadge]}>
                  <View style={[styles.onlineDot, !profile.online && styles.offlineDot]} />
                  <Text style={[styles.onlineText, !profile.online && styles.offlineText]}>
                    {profile.online ? '온라인' : '오프라인'}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileId}>@{profile.userId}</Text>
            </View>
          </View>

          {/* ===== 2. 자기소개 ===== */}
          {(profile.bio || isOwnProfile) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="pencil-outline" size={16} color="#8D6E63" />
                <Text style={styles.cardTitle}>자기소개</Text>
              </View>
              <Text style={styles.bioText}>
                {profile.bio || '아직 자기소개를 작성하지 않았어요.'}
              </Text>
            </View>
          )}

          {/* ===== 3. 다른 사람: 친구 상태 ===== */}
          {!isOwnProfile && friendStatus && (
            <View style={[styles.card, friendStatus.status === 'FRIEND' && styles.cardFriend]}>
              {friendStatus.status === 'FRIEND' && (
                <View style={styles.friendRow}>
                  <View style={styles.friendBadge}>
                    <Ionicons name="checkmark-circle" size={22} color="#2D5016" />
                    <Text style={styles.friendBadgeText}>우리는 친구</Text>
                  </View>
                  <TouchableOpacity style={styles.friendDeleteBtn} onPress={handleRemoveFriend}>
                    <Text style={styles.friendDeleteText}>친구삭제</Text>
                  </TouchableOpacity>
                </View>
              )}
              {friendStatus.status === 'SENT' && (
                <View style={styles.friendBadge}>
                  <Ionicons name="time-outline" size={22} color="#C49A2A" />
                  <Text style={[styles.friendBadgeText, { color: '#C49A2A' }]}>친구 요청을 보냈습니다</Text>
                </View>
              )}
              {friendStatus.status === 'RECEIVED' && (
                <View style={styles.friendRow}>
                  <View style={styles.friendBadge}>
                    <Ionicons name="person-add" size={22} color="#2D5016" />
                    <Text style={styles.friendBadgeText}>친구 요청이 왔어요</Text>
                  </View>
                  <TouchableOpacity style={styles.friendAcceptBtn} onPress={handleAcceptFriendRequest}>
                    <Text style={styles.friendAcceptText}>수락</Text>
                  </TouchableOpacity>
                </View>
              )}
              {friendStatus.status === 'NONE' && (
                <TouchableOpacity style={styles.friendAddBtn} onPress={handleSendFriendRequest} activeOpacity={0.7}>
                  <Ionicons name="person-add-outline" size={18} color="#FFE156" />
                  <Text style={styles.friendAddText}>친구 요청하기</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ===== 4. 같은 반 동창 ===== */}
          {!isOwnProfile && sameSchools.length > 0 && (
            <View style={[styles.card, styles.cardSameClass]}>
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={18} color="#C49A2A" />
                <Text style={[styles.cardTitle, { color: '#C49A2A' }]}>우리는 같은 반 동창이에요!</Text>
              </View>
              {sameSchools.map((s, i) => (
                <View key={i} style={styles.sameClassRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#2D5016" />
                  <Text style={styles.sameClassText}>
                    {s.schoolName} · {s.graduationYear}년 · {s.grade}학년 {s.classNumber}반
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ===== 5. 다른 사람: 액션 버튼 ===== */}
          {!isOwnProfile && viewUserId && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Messages', { composeToId: viewUserId, composeToName: profile.name })}
              >
                <Ionicons name="mail-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>쪽지 보내기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline]}
                activeOpacity={0.7}
                onPress={async () => {
                  if (!user) return;
                  try {
                    const { roomId } = await chatAPI.createOrGetRoom(user.userId, viewUserId);
                    navigation.navigate('Chat', { screen: 'ChatHome', params: { openRoomId: roomId } });
                  } catch { Alert.alert('실패', '채팅방 생성에 실패했습니다'); }
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#2D5016" />
                <Text style={[styles.actionBtnText, { color: '#2D5016' }]}>대화 요청</Text>
              </TouchableOpacity>
            </View>
          )}


          {/* ===== 7. 내 프로필: 로그아웃 ===== */}
          {isOwnProfile && (
            <TouchableOpacity style={styles.logoutBtn} onPress={() => {
              if (Platform.OS === 'web') { if (window.confirm('정말 로그아웃하시겠습니까?')) logout(); }
              else Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [{ text: '취소', style: 'cancel' }, { text: '로그아웃', style: 'destructive', onPress: () => logout() }]);
            }}>
              <Ionicons name="log-out-outline" size={18} color={Colors.red} />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== Profile Edit Modal ===== */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.editContainer}>
            <View style={styles.editHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.editCancel}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.editHeaderTitle}>프로필 수정</Text>
              <TouchableOpacity onPress={handleSaveProfile} disabled={saving || !editName.trim()}>
                <Text style={[styles.editSave, (saving || !editName.trim()) && { opacity: 0.4 }]}>
                  {saving ? '저장 중...' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editBody} keyboardShouldPersistTaps="handled">
              <View style={styles.editField}>
                <Text style={styles.editLabel}>이름 <Text style={{ color: Colors.red }}>*</Text></Text>
                <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder="이름을 입력하세요" />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>자기소개</Text>
                <TextInput style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]} value={editBio} onChangeText={setEditBio} placeholder="자기소개를 입력하세요" multiline />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>프로필 이미지 URL</Text>
                <TextInput style={styles.editInput} value={editImageUrl} onChangeText={setEditImageUrl} placeholder="이미지 URL (선택)" autoCapitalize="none" keyboardType="url" />
              </View>

              {/* Schools */}
              <View style={styles.editField}>
                <View style={styles.editSchoolHeader}>
                  <Text style={styles.editLabel}>학교 정보</Text>
                  <TouchableOpacity style={styles.editAddSchoolBtn} onPress={addSchool}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.editAddSchoolText}>학교 추가</Text>
                  </TouchableOpacity>
                </View>

                {editSchools.map((school, index) => (
                  <View key={school.id} style={styles.editSchoolCard}>
                    <View style={styles.editSchoolCardHeader}>
                      <Text style={styles.editSchoolNum}>{index + 1}번째 학교</Text>
                      {editSchools.length > 1 && (
                        <TouchableOpacity onPress={() => removeSchool(school.id)}>
                          <Text style={styles.editSchoolRemove}>삭제</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.editSubLabel}>학교 유형</Text>
                    <View style={styles.chipRow}>
                      {SCHOOL_TYPES.map(type => (
                        <TouchableOpacity key={type} style={[styles.chip, school.schoolType === type && styles.chipActive]} onPress={() => updateSchoolField(school.id, 'schoolType', type)}>
                          <Text style={[styles.chipText, school.schoolType === type && styles.chipTextActive]}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.editSubLabel}>학교명</Text>
                    <View>
                      <TextInput style={styles.editInput} value={school.schoolName} onChangeText={(text) => onSchoolNameChange(school.id, text)} placeholder={school.schoolType ? '학교명 2글자 이상 입력' : '학교 유형을 먼저 선택하세요'} editable={!!school.schoolType} />
                      {editingSchoolId === school.id && schoolSearchResults.length > 0 && (
                        <View style={styles.acDropdown}>
                          {schoolSearchLoading && <ActivityIndicator style={{ padding: 10 }} size="small" color={Colors.primary} />}
                          {schoolSearchResults.slice(0, 5).map(r => (
                            <TouchableOpacity key={r.id} style={styles.acItem} onPress={() => selectSchoolResult(school.id, r)}>
                              <Text style={styles.acName}>{r.schoolName}</Text>
                              <Text style={styles.acInfo}>{r.schoolType} · {r.region}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <Text style={styles.editSubLabel}>졸업년도</Text>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setYearPickerSchoolId(school.id)}
                    >
                      <Text style={[styles.dropdownBtnText, !school.graduationYear && { color: Colors.textMuted }]}>
                        {school.graduationYear ? `${school.graduationYear}년` : '선택하세요'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <View style={styles.gcHeaderRow}>
                      <Text style={styles.editSubLabel}>학년 / 반</Text>
                      <TouchableOpacity onPress={() => addGradeClass(school.id)}>
                        <Text style={styles.gcAddText}>+ 추가</Text>
                      </TouchableOpacity>
                    </View>
                    {school.gradeClasses.map(gc => (
                      <View key={gc.id} style={styles.gcRow}>
                        <TouchableOpacity
                          style={[styles.dropdownBtn, { flex: 1 }]}
                          onPress={() => setGradePickerTarget({ schoolId: school.id, gcId: gc.id, schoolType: school.schoolType })}
                        >
                          <Text style={[styles.dropdownBtnText, !gc.grade && { color: Colors.textMuted }]}>
                            {gc.grade ? `${gc.grade}학년` : '학년'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                        </TouchableOpacity>
                        <TextInput style={styles.gcInput} value={gc.classNumber} onChangeText={(v) => updateGradeClass(school.id, gc.id, 'classNumber', v.replace(/[^0-9]/g, ''))} placeholder="반" keyboardType="number-pad" maxLength={2} />
                        {school.gradeClasses.length > 1 && (
                          <TouchableOpacity onPress={() => removeGradeClass(school.id, gc.id)} style={{ padding: 2 }}>
                            <Ionicons name="close-circle" size={20} color={Colors.red} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 졸업년도 선택 바텀시트 */}
      <Modal visible={yearPickerSchoolId !== null} transparent animationType="slide" onRequestClose={() => setYearPickerSchoolId(null)}>
        <TouchableOpacity style={styles.yearPickerOverlay} activeOpacity={1} onPress={() => setYearPickerSchoolId(null)}>
          <View style={styles.yearPickerSheet}>
            <View style={styles.yearPickerHeader}>
              <Text style={styles.yearPickerTitle}>졸업년도 선택</Text>
              <TouchableOpacity onPress={() => setYearPickerSchoolId(null)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={GRADUATION_YEARS}
              keyExtractor={(item) => String(item)}
              renderItem={({ item: year }) => (
                <TouchableOpacity
                  style={styles.yearPickerItem}
                  onPress={() => {
                    if (yearPickerSchoolId !== null) {
                      updateSchoolField(yearPickerSchoolId, 'graduationYear', String(year));
                    }
                    setYearPickerSchoolId(null);
                  }}
                >
                  <Text style={[
                    styles.yearPickerItemText,
                    yearPickerSchoolId !== null &&
                      editSchools.find(s => s.id === yearPickerSchoolId)?.graduationYear === String(year) &&
                      styles.yearPickerItemTextActive,
                  ]}>{year}년</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 학년 선택 바텀시트 */}
      <Modal visible={gradePickerTarget !== null} transparent animationType="slide" onRequestClose={() => setGradePickerTarget(null)}>
        <TouchableOpacity style={styles.yearPickerOverlay} activeOpacity={1} onPress={() => setGradePickerTarget(null)}>
          <View style={styles.yearPickerSheet}>
            <View style={styles.yearPickerHeader}>
              <Text style={styles.yearPickerTitle}>학년 선택</Text>
              <TouchableOpacity onPress={() => setGradePickerTarget(null)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={gradePickerTarget ? getGradeOptions(gradePickerTarget.schoolType) : []}
              keyExtractor={(item) => String(item)}
              renderItem={({ item: grade }) => (
                <TouchableOpacity
                  style={styles.yearPickerItem}
                  onPress={() => {
                    if (gradePickerTarget) {
                      updateGradeClass(gradePickerTarget.schoolId, gradePickerTarget.gcId, 'grade', String(grade));
                    }
                    setGradePickerTarget(null);
                  }}
                >
                  <Text style={styles.yearPickerItemText}>{grade}학년</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  scrollContent: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12,
    backgroundColor: '#2D5016', borderBottomWidth: 3, borderBottomColor: '#C49A2A',
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold, letterSpacing: 1 },

  // Profile card (centered)
  profileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { fontSize: 18, fontWeight: '800', color: Colors.text, fontFamily: Fonts.bold },
  profileId: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F0E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  onlineText: { fontSize: 11, color: '#2D5016', fontWeight: '600' },
  offlineBadge: { backgroundColor: '#f3f4f6' },
  offlineDot: { backgroundColor: '#9ca3af' },
  offlineText: { color: '#6b7280' },

  // Generic card
  card: {
    marginHorizontal: 16, marginTop: 12, padding: 16,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  cardFriend: { backgroundColor: '#E8F0E0', borderColor: '#C5D9B2' },
  cardSameClass: { backgroundColor: '#FFF8E7', borderWidth: 2, borderColor: '#C49A2A' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#8D6E63', fontFamily: Fonts.bold },

  // Bio
  bioText: { fontSize: 14, lineHeight: 22, color: Colors.textSecondary, fontFamily: Fonts.regular },

  // Friend status
  friendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  friendBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  friendBadgeText: { fontSize: 15, fontWeight: '700', color: '#2D5016', fontFamily: Fonts.bold },
  friendDeleteBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
  friendDeleteText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  friendAcceptBtn: { backgroundColor: '#2D5016', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  friendAcceptText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  friendAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2D5016', paddingVertical: 12, borderRadius: 10 },
  friendAddText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold },

  // Same class
  sameClassRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0E0B0' },
  sameClassText: { fontSize: 13, fontWeight: '600', color: '#2D5016', flex: 1 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#2D5016', paddingVertical: 13, borderRadius: 12,
  },
  actionBtnOutline: { backgroundColor: '#E8F0E0', borderWidth: 1, borderColor: '#2D5016' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: Fonts.bold },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 20, padding: 14,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F0E0B0',
  },
  logoutText: { color: Colors.red, fontSize: 14, fontWeight: '600' },

  // ===== Edit Modal =====
  editContainer: { flex: 1, backgroundColor: '#FFF8E7' },
  editHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0E0B0',
  },
  editCancel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  editHeaderTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, fontFamily: Fonts.bold },
  editSave: { fontSize: 15, color: '#2D5016', fontWeight: '700' },
  editBody: { flex: 1, padding: 16 },

  editField: { marginBottom: 20 },
  editLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8, fontFamily: Fonts.bold },
  editSubLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  editInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0E0B0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text,
  },

  editSchoolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editAddSchoolBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editAddSchoolText: { fontSize: 13, fontWeight: '600', color: '#2D5016' },

  editSchoolCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#F0E0B0',
  },
  editSchoolCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editSchoolNum: { fontSize: 13, fontWeight: '700', color: '#2D5016' },
  editSchoolRemove: { fontSize: 13, fontWeight: '600', color: Colors.red },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: '#F0E0B0',
  },
  chipActive: { backgroundColor: '#E8F0E0', borderColor: '#2D5016' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#B8A88A' },
  chipTextActive: { color: '#2D5016' },

  acDropdown: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0E0B0',
    borderRadius: 10, marginTop: 4, maxHeight: 200, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  acItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0E0B0' },
  acName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  acInfo: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  rowFields: { flexDirection: 'row', gap: 12 },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0E0B0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  dropdownBtnText: { fontSize: 14, color: Colors.text },

  gcHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 },
  gcAddText: { fontSize: 12, fontWeight: '600', color: '#2D5016' },
  gcRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  gcPickerWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  gcGradeChip: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: '#F0E0B0',
  },
  gcGradeChipActive: { backgroundColor: '#E8F0E0', borderColor: '#2D5016' },
  gcGradeChipText: { fontSize: 12, fontWeight: '600', color: '#B8A88A' },
  gcGradeChipTextActive: { color: '#2D5016' },
  gcUnitText: { fontSize: 12, color: Colors.textSecondary, marginLeft: 2 },
  gcInput: {
    width: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0E0B0',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, textAlign: 'center',
  },

  // Year picker bottom sheet
  yearPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  yearPickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '50%', paddingBottom: 30,
  },
  yearPickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  yearPickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  yearPickerItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  yearPickerItemText: { fontSize: 15, color: Colors.text },
  yearPickerItemTextActive: { color: '#2D5016', fontWeight: '700' },
});
