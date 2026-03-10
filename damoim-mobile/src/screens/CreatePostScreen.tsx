import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
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
import { useAuth } from '../hooks/useAuth';
import { postAPI } from '../api/post';
import { userAPI, ProfileResponse } from '../api/user';

type VisibilityOption = 'SCHOOL' | 'GRADE' | 'CLASS';

const VISIBILITY_OPTIONS: { key: VisibilityOption; label: string; icon: string }[] = [
  { key: 'SCHOOL', label: '학교전체', icon: 'earth' },
  { key: 'GRADE', label: '학년', icon: 'school' },
  { key: 'CLASS', label: '반', icon: 'people' },
];

const MAX_IMAGES = 5;

export default function CreatePostScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<VisibilityOption>('SCHOOL');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

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

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('알림', `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
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

    setSubmitting(true);
    try {
      // Upload images first
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        setUploadingImage(true);
        uploadedUrls = await Promise.all(images.map((uri) => postAPI.uploadImage(uri)));
        setUploadingImage(false);
      }

      await postAPI.createPost(user.userId, {
        content: trimmed,
        imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        schoolName: primarySchool?.schoolName,
        graduationYear: primarySchool?.graduationYear,
        visibility,
        targetGrade: visibility !== 'SCHOOL' ? primarySchool?.grade : undefined,
        targetClassNumber: visibility === 'CLASS' ? primarySchool?.classNumber : undefined,
      });

      navigation?.goBack?.();
    } catch (err: any) {
      setUploadingImage(false);
      Alert.alert('오류', '게시글 작성에 실패했습니다. 다시 시도해주세요.');
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
        <Text style={styles.headerTitle}>글 작성</Text>
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
              게시
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* Visibility selector */}
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
                onPress={() => setVisibility(opt.key)}
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

        {/* Image preview */}
        {images.length > 0 && (
          <View style={styles.imageSection}>
            <FlatList
              data={images}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item}-${index}`}
              contentContainerStyle={styles.imageList}
              renderItem={({ item, index }) => (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: item }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.imageRemoveButton}
                    onPress={() => removeImage(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.red} />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {/* Uploading indicator */}
        {uploadingImage && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.uploadingText}>이미지 업로드 중...</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickImages}
          disabled={images.length >= MAX_IMAGES}
          activeOpacity={0.7}
        >
          <Ionicons
            name="image-outline"
            size={24}
            color={images.length >= MAX_IMAGES ? Colors.gray300 : Colors.gray600}
          />
          <Text
            style={[
              styles.toolbarButtonText,
              images.length >= MAX_IMAGES && styles.toolbarButtonTextDisabled,
            ]}
          >
            사진 {images.length}/{MAX_IMAGES}
          </Text>
        </TouchableOpacity>

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2D5016',
    borderBottomWidth: 3,
    borderBottomColor: '#C49A2A',
  },
  headerTitle: {
    fontSize: 16,
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
  imageSection: {
    marginTop: 12,
  },
  imageList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  imagePreviewWrap: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.gray100,
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.white,
    borderRadius: 11,
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0E0B0',
    backgroundColor: '#fff',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarButtonText: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '500',
  },
  toolbarButtonTextDisabled: {
    color: Colors.gray300,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
