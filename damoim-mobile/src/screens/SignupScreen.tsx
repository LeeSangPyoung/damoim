import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/colors';
import { authAPI, SchoolInfo } from '../api/auth';

interface SignupScreenProps {
  navigation: any;
}

const SCHOOL_TYPES = [
  { label: '초등학교', value: '초등학교' },
  { label: '중학교', value: '중학교' },
  { label: '고등학교', value: '고등학교' },
];

const EMPTY_SCHOOL: SchoolInfo = {
  schoolType: '고등학교',
  schoolName: '',
  graduationYear: '',
  grade: '',
  classNumber: '',
};

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [schools, setSchools] = useState<SchoolInfo[]>([{ ...EMPTY_SCHOOL }]);
  const [loading, setLoading] = useState(false);

  const updateSchool = (index: number, field: keyof SchoolInfo, value: string) => {
    setSchools((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSchool = () => {
    if (schools.length >= 5) {
      Toast.show({ type: 'info', text1: '학교는 최대 5개까지 등록할 수 있습니다.' });
      return;
    }
    setSchools((prev) => [...prev, { ...EMPTY_SCHOOL }]);
  };

  const removeSchool = (index: number) => {
    if (schools.length <= 1) {
      Toast.show({ type: 'info', text1: '최소 1개의 학교 정보가 필요합니다.' });
      return;
    }
    setSchools((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    if (!userId.trim()) return '아이디를 입력해주세요.';
    if (userId.trim().length < 4) return '아이디는 4자 이상이어야 합니다.';
    if (!password) return '비밀번호를 입력해주세요.';
    if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
    if (password !== passwordConfirm) return '비밀번호가 일치하지 않습니다.';
    if (!name.trim()) return '이름을 입력해주세요.';
    if (!email.trim()) return '이메일을 입력해주세요.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return '올바른 이메일 형식을 입력해주세요.';

    for (let i = 0; i < schools.length; i++) {
      const s = schools[i];
      if (!s.schoolName.trim()) return `${i + 1}번째 학교명을 입력해주세요.`;
      if (!s.graduationYear.trim()) return `${i + 1}번째 졸업년도를 입력해주세요.`;
      if (!/^\d{4}$/.test(s.graduationYear.trim())) return `${i + 1}번째 졸업년도는 4자리 숫자로 입력해주세요.`;
    }
    return null;
  };

  const handleSignup = async () => {
    const error = validate();
    if (error) {
      Toast.show({ type: 'error', text1: error });
      return;
    }

    setLoading(true);
    try {
      const cleanSchools = schools.map((s) => ({
        schoolType: s.schoolType,
        schoolName: s.schoolName.trim(),
        graduationYear: s.graduationYear.trim(),
        grade: s.grade?.trim() || undefined,
        classNumber: s.classNumber?.trim() || undefined,
      }));

      await authAPI.signup({
        userId: userId.trim(),
        password,
        name: name.trim(),
        email: email.trim(),
        schools: cleanSchools,
      });

      Toast.show({
        type: 'success',
        text1: '회원가입 완료',
        text2: '로그인 화면으로 이동합니다.',
      });
      navigation.goBack();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data ||
        '회원가입에 실패했습니다. 다시 시도해주세요.';
      Toast.show({ type: 'error', text1: '회원가입 실패', text2: String(message) });
    } finally {
      setLoading(false);
    }
  };

  const renderSchoolTypePicker = (school: SchoolInfo, index: number) => (
    <View style={styles.schoolTypePicker}>
      {SCHOOL_TYPES.map((type) => (
        <TouchableOpacity
          key={type.value}
          style={[
            styles.schoolTypeChip,
            school.schoolType === type.value && styles.schoolTypeChipActive,
          ]}
          onPress={() => updateSchool(index, 'schoolType', type.value)}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.schoolTypeChipText,
              school.schoolType === type.value && styles.schoolTypeChipTextActive,
            ]}
          >
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSchoolCard = (school: SchoolInfo, index: number) => (
    <View key={index} style={styles.schoolCard}>
      <View style={styles.schoolCardHeader}>
        <Text style={styles.schoolCardTitle}>학교 {index + 1}</Text>
        {schools.length > 1 && (
          <TouchableOpacity
            onPress={() => removeSchool(index)}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeButton}>삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>학교 구분</Text>
      {renderSchoolTypePicker(school, index)}

      <Text style={styles.label}>학교명</Text>
      <TextInput
        style={styles.input}
        placeholder="예: 서울고등학교"
        placeholderTextColor={Colors.textMuted}
        value={school.schoolName}
        onChangeText={(v) => updateSchool(index, 'schoolName', v)}
        autoCorrect={false}
        editable={!loading}
      />

      <Text style={styles.label}>졸업년도</Text>
      <TextInput
        style={styles.input}
        placeholder="예: 2005"
        placeholderTextColor={Colors.textMuted}
        value={school.graduationYear}
        onChangeText={(v) => updateSchool(index, 'graduationYear', v)}
        keyboardType="number-pad"
        maxLength={4}
        editable={!loading}
      />

      <View style={styles.optionalRow}>
        <View style={styles.optionalField}>
          <Text style={styles.labelOptional}>학년 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 3"
            placeholderTextColor={Colors.textMuted}
            value={school.grade}
            onChangeText={(v) => updateSchool(index, 'grade', v)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!loading}
          />
        </View>
        <View style={styles.optionalField}>
          <Text style={styles.labelOptional}>반 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 7"
            placeholderTextColor={Colors.textMuted}
            value={school.classNumber}
            onChangeText={(v) => updateSchool(index, 'classNumber', v)}
            keyboardType="number-pad"
            maxLength={2}
            editable={!loading}
          />
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>우리반에 가입하고 동창을 찾아보세요</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              style={styles.input}
              placeholder="4자 이상 입력"
              placeholderTextColor={Colors.textMuted}
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="6자 이상 입력"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 다시 입력"
              placeholderTextColor={Colors.textMuted}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <Text style={styles.errorHint}>비밀번호가 일치하지 않습니다.</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              placeholder="실명을 입력하세요"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>
        </View>

        {/* School Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>학교 정보</Text>
          <Text style={styles.sectionDesc}>
            졸업한 학교 정보를 입력하면 동창을 찾을 수 있습니다.
          </Text>

          {schools.map((school, index) => renderSchoolCard(school, index))}

          <TouchableOpacity
            style={styles.addSchoolButton}
            onPress={addSchool}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.addSchoolButtonText}>+ 학교 추가</Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.signupButton, loading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.signupButtonText}>가입하기</Text>
          )}
        </TouchableOpacity>

        {/* Back to login */}
        <TouchableOpacity
          style={styles.backToLogin}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backToLoginText}>이미 계정이 있으신가요? 로그인</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginTop: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 6,
  },
  labelOptional: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.text,
  },
  errorHint: {
    fontSize: 12,
    color: Colors.red,
    marginTop: 4,
  },
  schoolCard: {
    backgroundColor: Colors.slate50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  schoolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  schoolCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gray700,
  },
  removeButton: {
    fontSize: 13,
    color: Colors.red,
    fontWeight: '600',
  },
  schoolTypePicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  schoolTypeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  schoolTypeChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  schoolTypeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
  },
  schoolTypeChipTextActive: {
    color: Colors.primary,
  },
  optionalRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  optionalField: {
    flex: 1,
  },
  addSchoolButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addSchoolButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  signupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 50,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonDisabled: {
    backgroundColor: Colors.gray400,
    shadowOpacity: 0,
  },
  signupButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  backToLogin: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
