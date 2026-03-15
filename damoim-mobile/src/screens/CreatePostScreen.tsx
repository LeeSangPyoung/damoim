import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/colors';
import { HEADER_TOP_PADDING } from '../constants/config';
import { useAuth } from '../hooks/useAuth';
import { postAPI } from '../api/post';
import { userAPI, ProfileResponse } from '../api/user';

type VisibilityOption = 'SCHOOL' | 'GRADE' | 'CLASS';

const VISIBILITY_OPTIONS: { key: VisibilityOption; label: string; icon: string }[] = [
  { key: 'SCHOOL', label: '우리학교', icon: 'earth' },
  { key: 'GRADE', label: '우리학년', icon: 'school' },
  { key: 'CLASS', label: '우리반', icon: 'people' },
];

const MAX_IMAGES = 5;

export default function CreatePostScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const isEditMode = !!route?.params?.postId;
  const editPostId: number | undefined = route?.params?.postId;
  const [content, setContent] = useState(route?.params?.content || '');
  const [images, setImages] = useState<string[]>(route?.params?.imageUrls || []);
  const [visibility, setVisibility] = useState<VisibilityOption>(() => {
    const currentFilter = route?.params?.currentFilter;
    if (currentFilter === 'myClass') return 'CLASS';
    if (currentFilter === 'myGrade') return 'GRADE';
    return 'SCHOOL';
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // 우리반 선택용: route에서 전달받은 gradeClasses와 선택된 반
  const routeGradeClasses: { grade: string; classNumber?: string }[] = route?.params?.gradeClasses || [];
  const routeSelectedClass: { grade: string; classNumber: string } | undefined = route?.params?.selectedClass;

  const [selectedClass, setSelectedClass] = useState<{ grade: string; classNumber: string } | null>(
    routeSelectedClass || null
  );

  // Load profile for school info
  React.useEffect(() => {
    if (!user?.userId) return;
    userAPI
      .getProfile(user.userId)
      .then((data) => {
        setProfile(data);
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [user?.userId]);

  const routeSchool = route?.params?.schoolName ? {
    schoolName: route.params.schoolName,
    graduationYear: route.params.graduationYear,
  } : null;
  const primarySchool = routeSchool || profile?.schools?.[0];

  // 프로필에서 해당 학교의 학년/반 목록 (route에서 없으면 프로필에서 추출)
  const gradeClasses = routeGradeClasses.length > 0
    ? routeGradeClasses
    : (profile?.schools || [])
        .filter(s => s.schoolName === primarySchool?.schoolName && s.graduationYear === primarySchool?.graduationYear && s.grade)
        .map(s => ({ grade: s.grade!, classNumber: s.classNumber }));

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('알림', `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = (e: any) => {
        const files = Array.from(e.target?.files || []) as File[];
        const remaining = MAX_IMAGES - images.length;
        files.slice(0, remaining).forEach(file => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setImages(prev => [...prev, reader.result as string].slice(0, MAX_IMAGES));
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
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user?.userId) return;

    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    // 우리반 선택 시 반이 선택되어 있는지 확인
    if (visibility === 'CLASS' && !selectedClass) {
      Alert.alert('반 선택 필요', '우리반으로 게시하려면 반을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload new images (skip already-uploaded URLs)
      let finalUrls: string[] = [];
      if (images.length > 0) {
        setUploadingImage(true);
        finalUrls = await Promise.all(
          images.map((uri) =>
            uri.startsWith('http') ? Promise.resolve(uri) : postAPI.uploadImage(uri)
          )
        );
        setUploadingImage(false);
      }

      if (isEditMode && editPostId) {
        await postAPI.updatePost(editPostId, user.userId, {
          content: trimmed,
          imageUrls: finalUrls.length > 0 ? finalUrls : undefined,
        });
      } else {
        await postAPI.createPost(user.userId, {
          content: trimmed,
          imageUrls: finalUrls.length > 0 ? finalUrls : undefined,
          schoolName: primarySchool?.schoolName,
          graduationYear: primarySchool?.graduationYear,
          visibility,
          targetGrade: visibility === 'GRADE'
            ? (gradeClasses[0]?.grade)
            : visibility === 'CLASS'
              ? selectedClass?.grade
              : undefined,
          targetClassNumber: visibility === 'CLASS' ? selectedClass?.classNumber : undefined,
        });
      }

      navigation?.goBack?.();
    } catch (err: any) {
      setUploadingImage(false);
      Alert.alert('오류', isEditMode ? '게시글 수정에 실패했습니다.' : '게시글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = content.trim().length > 0 && !submitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} activeOpacity={0.7}>
          <Ionicons name="close" size={26} color="#FFE156" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? '글 수정' : '글 작성'}</Text>
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#2D5016" />
          ) : (
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
              {isEditMode ? '수정' : '게시'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* Visibility selector - hide in edit mode */}
        {!isEditMode && (
          <>
            <View style={styles.visibilityContainer}>
              <Text style={styles.visibilityLabel}>공개 범위</Text>
              <View style={styles.visibilityOptions}>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.visibilityChip,
                      visibility === opt.key && styles.visibilityChipActive,
                    ]}
                    onPress={() => {
                      setVisibility(opt.key);
                      if (opt.key !== 'CLASS') {
                        setSelectedClass(null);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={14}
                      color={visibility === opt.key ? '#FFE156' : '#8D6E63'}
                    />
                    <Text
                      style={[
                        styles.visibilityChipText,
                        visibility === opt.key && styles.visibilityChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 우리반 선택 시 반 선택 드롭다운 */}
            {visibility === 'CLASS' && gradeClasses.length > 0 && (
              <View style={styles.classSelectContainer}>
                <Text style={styles.classSelectLabel}>
                  <Ionicons name="people" size={13} color={Colors.primary} /> 어느 반에 게시할까요?
                </Text>
                <View style={styles.classSelectChips}>
                  {gradeClasses
                    .filter(gc => gc.classNumber)
                    .sort((a, b) => {
                      const gDiff = Number(a.grade || 0) - Number(b.grade || 0);
                      if (gDiff !== 0) return gDiff;
                      return Number(a.classNumber || 0) - Number(b.classNumber || 0);
                    })
                    .map((gc, idx) => {
                      const isActive = selectedClass?.grade === gc.grade && selectedClass?.classNumber === gc.classNumber;
                      return (
                        <TouchableOpacity
                          key={`${gc.grade}-${gc.classNumber}-${idx}`}
                          style={[styles.classSelectChip, isActive && styles.classSelectChipActive]}
                          onPress={() => setSelectedClass({ grade: gc.grade, classNumber: gc.classNumber! })}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.classSelectChipText, isActive && styles.classSelectChipTextActive]}>
                            {gc.grade}학년 {gc.classNumber}반
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
                {!selectedClass && (
                  <Text style={styles.classSelectHint}>
                    반을 선택하지 않으면 게시할 수 없어요
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {/* Content input */}
        <TextInput
          style={styles.contentInput}
          placeholder="동창들에게 공유하고 싶은 이야기를 적어보세요..."
          placeholderTextColor={Colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          autoFocus
        />

        {/* Image section - always visible */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageList}
          >
            {images.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.imagePreviewWrap}>
                <Image source={{ uri }} style={styles.imagePreview} />
                {index === 0 && images.length > 1 && (
                  <View style={styles.imageBadge}>
                    <Text style={styles.imageBadgeText}>대표</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.imageRemoveButton}
                  onPress={() => removeImage(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.imageRemoveCircle}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add button - always shown when under limit */}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.imageAddButton} onPress={pickImages} activeOpacity={0.7}>
                <Ionicons name="add" size={28} color={Colors.gray400} />
                <Text style={styles.imageAddText}>{images.length}/{MAX_IMAGES}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Uploading indicator */}
        {uploadingImage && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadingText}>이미지 업로드 중...</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar - char count only */}
      <View style={styles.toolbar}>
        <Text style={styles.charCount}>{content.length}자</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  submitButton: {
    backgroundColor: '#FFE156',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray200,
  },
  submitText: {
    color: '#2D5016',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  submitTextDisabled: {
    color: Colors.gray400,
  },
  body: {
    flex: 1,
  },
  visibilityContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E0B0',
    gap: 5,
  },
  visibilityChipActive: {
    backgroundColor: '#2D5016',
    borderColor: '#2D5016',
  },
  visibilityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
    fontFamily: Fonts.bold,
  },
  visibilityChipTextActive: {
    color: '#FFE156',
  },
  // 반 선택
  classSelectContainer: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    padding: 12,
  },
  classSelectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 10,
  },
  classSelectChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F0E0B0',
  },
  classSelectChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  classSelectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
    fontFamily: Fonts.bold,
  },
  classSelectChipTextActive: {
    color: '#FFE156',
  },
  classSelectHint: {
    fontSize: 11,
    color: Colors.red,
    marginTop: 8,
    fontWeight: '500',
  },
  contentInput: {
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
  // 이미지 섹션 - 개선
  imageSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  imageList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'visible',
  },
  imagePreview: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: '#F0E0B0',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  imageBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFE156',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
  },
  imageRemoveCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageAddButton: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F0E0B0',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  imageAddText: {
    fontSize: 11,
    color: Colors.gray400,
    fontWeight: '500',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  uploadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
