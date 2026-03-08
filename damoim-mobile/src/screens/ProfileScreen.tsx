import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, RefreshControl, Modal, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { userAPI, ProfileResponse, ClassmateInfo, SchoolUpdateInfo } from '../api/user';
import { friendAPI, FriendResponse } from '../api/friend';
import { schoolAPI, SchoolSearchResult } from '../api/school';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';

type TabType = 'profile' | 'classmates' | 'friends';

interface GradeClass {
  id: number;
  grade: string;
  classNumber: string;
}

interface EditableSchool {
  id: number;
  schoolCode: string;
  schoolType: string;
  schoolName: string;
  graduationYear: string;
  gradeClasses: GradeClass[];
}

function groupSchools(profileSchools: ProfileResponse['schools']): EditableSchool[] {
  const map = new Map<string, EditableSchool>();
  let schoolId = 1;
  let gcId = 1;

  for (const s of profileSchools) {
    const key = `${s.schoolType}|${s.schoolName}|${s.graduationYear}`;
    if (map.has(key)) {
      const existing = map.get(key)!;
      if (s.grade || s.classNumber) {
        existing.gradeClasses.push({ id: gcId++, grade: s.grade || '', classNumber: s.classNumber || '' });
      }
    } else {
      const gradeClasses: GradeClass[] = [];
      if (s.grade || s.classNumber) {
        gradeClasses.push({ id: gcId++, grade: s.grade || '', classNumber: s.classNumber || '' });
      } else {
        gradeClasses.push({ id: gcId++, grade: '', classNumber: '' });
      }
      map.set(key, {
        id: schoolId++,
        schoolCode: s.schoolCode || '',
        schoolType: s.schoolType,
        schoolName: s.schoolName,
        graduationYear: s.graduationYear,
        gradeClasses,
      });
    }
  }
  return Array.from(map.values());
}

function getGradeOptions(schoolType: string): number[] {
  switch (schoolType) {
    case '초등학교': return [1, 2, 3, 4, 5, 6];
    case '중학교':
    case '고등학교': return [1, 2, 3];
    case '대학교': return [1, 2, 3, 4, 5, 6];
    default: return [1, 2, 3, 4, 5, 6];
  }
}

function getGraduationYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= currentYear - 60; y--) years.push(y);
  return years;
}

const SCHOOL_TYPES = ['초등학교', '중학교', '고등학교', '대학교'];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, logout } = useAuth();
  const targetUserId = route.params?.userId as string | undefined;
  const isOwnProfile = !targetUserId || targetUserId === user?.userId;
  const viewUserId = targetUserId || user?.userId;
  const [tab, setTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [classmates, setClassmates] = useState<ClassmateInfo[]>([]);
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendResponse[]>([]);

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

  // Classmate search
  const [searchName, setSearchName] = useState('');

  useEffect(() => { if (viewUserId) loadProfile(); }, [viewUserId]);

  const loadProfile = async () => {
    if (!viewUserId) return;
    try {
      const p = await userAPI.getProfile(viewUserId);
      setProfile(p);

      // 자기 프로필일 때만 친구/요청 로드
      if (isOwnProfile && user) {
        const [fr, pr] = await Promise.all([
          friendAPI.getMyFriends(user.userId),
          friendAPI.getPendingRequests(user.userId),
        ]);
        setFriends(fr);
        setPendingRequests(pr);
      }

      if (p.schools.length > 0) {
        const school = p.schools[0];
        if (school.schoolCode && user) {
          const res = await userAPI.searchClassmates(user.userId, school.schoolCode, school.graduationYear);
          setClassmates(res.classmates);
        }
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
    if (!editName.trim()) {
      Alert.alert('오류', '이름은 필수 항목입니다.');
      return;
    }

    const validSchools = editSchools.filter(s => s.schoolType && s.schoolName && s.graduationYear);
    if (validSchools.length === 0) {
      Alert.alert('오류', '최소 1개 이상의 학교 정보를 입력해주세요.');
      return;
    }

    const schoolsData: SchoolUpdateInfo[] = [];
    for (const school of validSchools) {
      const validGCs = school.gradeClasses.filter(gc => gc.grade || gc.classNumber);
      if (validGCs.length === 0) {
        schoolsData.push({
          schoolCode: school.schoolCode || undefined,
          schoolType: school.schoolType,
          schoolName: school.schoolName,
          graduationYear: school.graduationYear,
        });
      } else {
        for (const gc of validGCs) {
          schoolsData.push({
            schoolCode: school.schoolCode || undefined,
            schoolType: school.schoolType,
            schoolName: school.schoolName,
            graduationYear: school.graduationYear,
            grade: gc.grade || undefined,
            classNumber: gc.classNumber || undefined,
          });
        }
      }
    }

    try {
      setSaving(true);
      const updated = await userAPI.updateProfile(user.userId, {
        name: editName.trim(),
        bio: editBio.trim() || undefined,
        profileImageUrl: editImageUrl.trim() || undefined,
        schools: schoolsData,
      });
      setProfile(updated);
      setShowEditModal(false);
      Alert.alert('완료', '프로필이 수정되었습니다');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error || '프로필 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // School editing helpers
  const addSchool = () => {
    const newId = editSchools.length > 0 ? Math.max(...editSchools.map(s => s.id)) + 1 : 1;
    setEditSchools(prev => [...prev, {
      id: newId, schoolCode: '', schoolType: '', schoolName: '', graduationYear: '',
      gradeClasses: [{ id: 1, grade: '', classNumber: '' }],
    }]);
  };

  const removeSchool = (id: number) => {
    if (editSchools.length <= 1) {
      Alert.alert('알림', '최소 1개 학교는 필요합니다.');
      return;
    }
    setEditSchools(prev => prev.filter(s => s.id !== id));
  };

  const updateSchoolField = (schoolId: number, field: string, value: string) => {
    setEditSchools(prev => prev.map(s => {
      if (s.id !== schoolId) return s;
      const updated = { ...s, [field]: value };
      if (field === 'schoolType') {
        updated.schoolCode = '';
        updated.schoolName = '';
      }
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

  // School name search
  const handleSchoolSearch = useCallback(async (query: string, schoolType: string) => {
    if (query.trim().length < 2) { setSchoolSearchResults([]); return; }
    setSchoolSearchLoading(true);
    try {
      const results = await schoolAPI.search(query, schoolType || undefined);
      setSchoolSearchResults(results);
    } catch {
      setSchoolSearchResults([]);
    } finally {
      setSchoolSearchLoading(false);
    }
  }, []);

  const onSchoolNameChange = (schoolId: number, text: string) => {
    updateSchoolField(schoolId, 'schoolName', text);
    setEditingSchoolId(schoolId);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const school = editSchools.find(s => s.id === schoolId);
    searchDebounceRef.current = setTimeout(() => handleSchoolSearch(text, school?.schoolType || ''), 300);
  };

  const selectSchoolResult = (schoolId: number, result: SchoolSearchResult) => {
    setEditSchools(prev => prev.map(s => {
      if (s.id !== schoolId) return s;
      return { ...s, schoolCode: result.schoolCode, schoolName: result.schoolName };
    }));
    setEditingSchoolId(null);
    setSchoolSearchResults([]);
  };

  const handleFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    try {
      await friendAPI.sendRequest(user.userId, targetUserId);
      Alert.alert('완료', '친구 요청을 보냈습니다');
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.error || '요청 실패');
    }
  };

  const handleAcceptRequest = async (friendshipId: number) => {
    if (!user) return;
    try {
      await friendAPI.acceptRequest(friendshipId, user.userId);
      loadProfile();
    } catch {}
  };

  const handleSearch = async () => {
    if (!user || !searchName.trim()) return;
    try {
      const res = await userAPI.searchUsers({ currentUserId: user.userId, name: searchName.trim() });
      setClassmates(res.classmates);
    } catch {}
  };

  if (loading) return <LoadingScreen message="프로필 로딩 중..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isOwnProfile ? '프로필' : profile?.name || '프로필'}</Text>
        <View style={{ width: 32 }} />
      </View>
      {/* Tabs - 자기 프로필일 때만 표시 */}
      {isOwnProfile && (
        <View style={styles.tabRow}>
          {([['profile', '내 정보'], ['classmates', '동창 찾기'], ['friends', '친구']] as [TabType, string][]).map(([t, label]) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {label}
                {t === 'friends' && pendingRequests.length > 0 && ` (${pendingRequests.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && profile && (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} />}>
          <View style={styles.profileCard}>
            <Avatar uri={profile.profileImageUrl} name={profile.name} size={80} online={profile.online} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileId}>@{profile.userId}</Text>
              {profile.bio && <Text style={styles.profileBio}>{profile.bio}</Text>}
              {isOwnProfile && (
                <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
                  <Text style={styles.editBtnText}>프로필 수정</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Schools */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>학교 정보</Text>
            {Object.values(
              profile.schools.reduce<Record<string, { schoolName: string; graduationYear: string; schoolType: string; grades: { grade: string; classNumber?: string }[] }>>((acc, s) => {
                const key = `${s.schoolName}_${s.graduationYear}`;
                if (!acc[key]) {
                  acc[key] = { schoolName: s.schoolName, graduationYear: s.graduationYear, schoolType: s.schoolType, grades: [] };
                }
                if (s.grade) {
                  acc[key].grades.push({ grade: s.grade, classNumber: s.classNumber });
                }
                return acc;
              }, {})
            ).map((school, i) => (
              <View key={i} style={styles.schoolRow}>
                <Text style={styles.schoolName}>{school.schoolName}</Text>
                <Text style={styles.schoolDetail}>{school.graduationYear}년 졸업</Text>
                {school.grades.length > 0 && (
                  <View style={styles.gradeChipsRow}>
                    {school.grades.map((g, j) => (
                      <View key={j} style={styles.gradeChip}>
                        <Text style={styles.gradeChipText}>
                          {g.grade}학년{g.classNumber ? ` ${g.classNumber}반` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Logout - 자기 프로필일 때만 */}
          {isOwnProfile && (
            <TouchableOpacity style={styles.logoutBtn} onPress={() => {
              if (Platform.OS === 'web') {
                if (window.confirm('정말 로그아웃하시겠습니까?')) {
                  logout();
                }
              } else {
                Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
                  { text: '취소', style: 'cancel' },
                  { text: '로그아웃', style: 'destructive', onPress: () => logout() },
                ]);
              }
            }}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Classmates Tab */}
      {tab === 'classmates' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} placeholder="이름으로 검색" value={searchName} onChangeText={setSearchName} onSubmitEditing={handleSearch} returnKeyType="search" />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}><Text style={styles.searchBtnText}>검색</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {classmates.length === 0 && <EmptyState icon="🔍" title="동창을 검색해보세요" />}
            {classmates.map(cm => (
              <View key={cm.id} style={styles.classmateRow}>
                <Avatar uri={cm.profileImageUrl} name={cm.name} size={44} online={cm.online} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.classmateName}>{cm.name}</Text>
                  <Text style={styles.classmateSchool}>{cm.school.schoolName} {cm.school.graduationYear}</Text>
                </View>
                <TouchableOpacity style={styles.friendReqBtn} onPress={() => handleFriendRequest(cm.userId)}>
                  <Text style={styles.friendReqText}>친구 추가</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Friends Tab */}
      {tab === 'friends' && (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} />}>
          {pendingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>받은 친구 요청 ({pendingRequests.length})</Text>
              {pendingRequests.map(req => (
                <View key={req.friendshipId} style={styles.classmateRow}>
                  <Avatar uri={req.profileImageUrl} name={req.name} size={40} />
                  <Text style={[styles.classmateName, { flex: 1, marginLeft: 10 }]}>{req.name}</Text>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptRequest(req.friendshipId)}>
                    <Text style={styles.acceptBtnText}>수락</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>내 친구 ({friends.length})</Text>
            {friends.length === 0 && <Text style={styles.emptyText}>아직 친구가 없습니다</Text>}
            {friends.map(f => (
              <View key={f.friendshipId} style={styles.classmateRow}>
                <Avatar uri={f.profileImageUrl} name={f.name} size={40} />
                <Text style={[styles.classmateName, { flex: 1, marginLeft: 10 }]}>{f.name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ===== Profile Edit Modal ===== */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.editModalContainer}>
            {/* Edit Header */}
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.editModalCancel}>취소</Text>
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>프로필 수정</Text>
              <TouchableOpacity onPress={handleSaveProfile} disabled={saving || !editName.trim()}>
                <Text style={[styles.editModalSave, (saving || !editName.trim()) && { opacity: 0.4 }]}>
                  {saving ? '저장 중...' : '저장'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalBody} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>이름 <Text style={{ color: Colors.red }}>*</Text></Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="이름을 입력하세요"
                />
              </View>

              {/* Bio */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>자기소개</Text>
                <TextInput
                  style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="자기소개를 입력하세요"
                  multiline
                />
              </View>

              {/* Profile Image URL */}
              <View style={styles.editField}>
                <Text style={styles.editLabel}>프로필 이미지 URL</Text>
                <TextInput
                  style={styles.editInput}
                  value={editImageUrl}
                  onChangeText={setEditImageUrl}
                  placeholder="이미지 URL을 입력하세요 (선택)"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Schools */}
              <View style={styles.editField}>
                <View style={styles.schoolSectionHeader}>
                  <Text style={styles.editLabel}>학교 정보</Text>
                  <TouchableOpacity style={styles.addSchoolBtn} onPress={addSchool}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.addSchoolText}>학교 추가</Text>
                  </TouchableOpacity>
                </View>

                {editSchools.map((school, index) => (
                  <View key={school.id} style={styles.schoolEditCard}>
                    <View style={styles.schoolEditHeader}>
                      <Text style={styles.schoolEditNumber}>{index + 1}번째 학교</Text>
                      {editSchools.length > 1 && (
                        <TouchableOpacity onPress={() => removeSchool(school.id)}>
                          <Text style={styles.schoolRemoveText}>삭제</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* School Type */}
                    <Text style={styles.fieldSubLabel}>학교 유형</Text>
                    <View style={styles.chipSelectRow}>
                      {SCHOOL_TYPES.map(type => (
                        <TouchableOpacity
                          key={type}
                          style={[styles.chipSelect, school.schoolType === type && styles.chipSelectActive]}
                          onPress={() => updateSchoolField(school.id, 'schoolType', type)}
                        >
                          <Text style={[styles.chipSelectText, school.schoolType === type && styles.chipSelectTextActive]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* School Name */}
                    <Text style={styles.fieldSubLabel}>학교명</Text>
                    <View>
                      <TextInput
                        style={styles.editInput}
                        value={school.schoolName}
                        onChangeText={(text) => onSchoolNameChange(school.id, text)}
                        placeholder={school.schoolType ? '학교명 2글자 이상 입력' : '학교 유형을 먼저 선택하세요'}
                        editable={!!school.schoolType}
                      />
                      {editingSchoolId === school.id && schoolSearchResults.length > 0 && (
                        <View style={styles.autocompleteDropdown}>
                          {schoolSearchLoading && (
                            <View style={styles.autocompleteLoading}>
                              <ActivityIndicator size="small" color={Colors.primary} />
                            </View>
                          )}
                          {schoolSearchResults.slice(0, 5).map(r => (
                            <TouchableOpacity
                              key={r.id}
                              style={styles.autocompleteItem}
                              onPress={() => selectSchoolResult(school.id, r)}
                            >
                              <Text style={styles.autocompleteName}>{r.schoolName}</Text>
                              <Text style={styles.autocompleteInfo}>{r.schoolType} · {r.region}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Graduation Year */}
                    <Text style={styles.fieldSubLabel}>졸업년도</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                      {getGraduationYears().slice(0, 40).map(year => (
                        <TouchableOpacity
                          key={year}
                          style={[styles.yearChip, school.graduationYear === String(year) && styles.yearChipActive]}
                          onPress={() => updateSchoolField(school.id, 'graduationYear', String(year))}
                        >
                          <Text style={[styles.yearChipText, school.graduationYear === String(year) && styles.yearChipTextActive]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Grade/Class */}
                    <View style={styles.gcHeader}>
                      <Text style={styles.fieldSubLabel}>학년 / 반</Text>
                      <TouchableOpacity onPress={() => addGradeClass(school.id)}>
                        <Text style={styles.gcAddText}>+ 추가</Text>
                      </TouchableOpacity>
                    </View>
                    {school.gradeClasses.map(gc => (
                      <View key={gc.id} style={styles.gcRow}>
                        <View style={styles.gcGradeWrap}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {getGradeOptions(school.schoolType).map(g => (
                              <TouchableOpacity
                                key={g}
                                style={[styles.gcChip, gc.grade === String(g) && styles.gcChipActive]}
                                onPress={() => updateGradeClass(school.id, gc.id, 'grade', String(g))}
                              >
                                <Text style={[styles.gcChipText, gc.grade === String(g) && styles.gcChipTextActive]}>
                                  {g}학년
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                        <TextInput
                          style={styles.gcClassInput}
                          value={gc.classNumber}
                          onChangeText={(v) => updateGradeClass(school.id, gc.id, 'classNumber', v.replace(/[^0-9]/g, ''))}
                          placeholder="반"
                          keyboardType="number-pad"
                          maxLength={2}
                        />
                        {school.gradeClasses.length > 1 && (
                          <TouchableOpacity onPress={() => removeGradeClass(school.id, gc.id)} style={styles.gcRemoveBtn}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12, backgroundColor: Colors.white },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.gray400 },
  tabTextActive: { color: Colors.primary },

  profileCard: { flexDirection: 'row', padding: 20, backgroundColor: Colors.white, margin: 12, borderRadius: 12 },
  profileName: { fontSize: 20, fontWeight: '800', color: Colors.text },
  profileId: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  profileBio: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  editBtn: { marginTop: 8, backgroundColor: Colors.gray100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: Colors.gray600 },

  section: { margin: 12, padding: 14, backgroundColor: Colors.white, borderRadius: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  schoolRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  schoolName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  schoolDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  gradeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  gradeChip: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  gradeChipText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  logoutBtn: { margin: 12, padding: 14, backgroundColor: Colors.redLight, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: Colors.red, fontSize: 14, fontWeight: '700' },

  searchRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: Colors.white },
  searchInput: { flex: 1, backgroundColor: Colors.gray50, borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: Colors.gray200 },
  searchBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  searchBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  classmateRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  classmateName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  classmateSchool: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  friendReqBtn: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  friendReqText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  acceptBtn: { backgroundColor: Colors.green, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  acceptBtnText: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },

  // ===== Edit Modal =====
  editModalContainer: { flex: 1, backgroundColor: Colors.background },
  editModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  editModalCancel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  editModalTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  editModalSave: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  editModalBody: { flex: 1, padding: 16 },

  editField: { marginBottom: 20 },
  editLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  editInput: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text,
  },

  // School edit
  schoolSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addSchoolBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addSchoolText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  schoolEditCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.gray200,
  },
  schoolEditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  schoolEditNumber: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  schoolRemoveText: { fontSize: 13, fontWeight: '600', color: Colors.red },

  fieldSubLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },

  chipSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipSelect: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.gray200,
  },
  chipSelectActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipSelectText: { fontSize: 13, fontWeight: '600', color: Colors.gray500 },
  chipSelectTextActive: { color: Colors.primary },

  autocompleteDropdown: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    borderRadius: 10, marginTop: 4, maxHeight: 200, overflow: 'hidden',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  autocompleteLoading: { padding: 10, alignItems: 'center' },
  autocompleteItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  autocompleteName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  autocompleteInfo: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  yearScroll: { marginBottom: 4 },
  yearChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.gray100, marginRight: 6, borderWidth: 1, borderColor: Colors.gray200,
  },
  yearChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  yearChipText: { fontSize: 12, fontWeight: '600', color: Colors.gray500 },
  yearChipTextActive: { color: Colors.primary },

  gcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 },
  gcAddText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  gcRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  gcGradeWrap: { flex: 1 },
  gcChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: Colors.gray100, marginRight: 4, borderWidth: 1, borderColor: Colors.gray200,
  },
  gcChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  gcChipText: { fontSize: 11, fontWeight: '600', color: Colors.gray500 },
  gcChipTextActive: { color: Colors.primary },
  gcClassInput: {
    width: 50, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, textAlign: 'center',
  },
  gcRemoveBtn: { padding: 2 },
});
