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
import { Colors, Fonts } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../api/auth';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedId = userId.trim();
    if (!trimmedId) {
      Toast.show({ type: 'error', text1: '아이디를 입력해주세요.' });
      return;
    }
    if (!password) {
      Toast.show({ type: 'error', text1: '비밀번호를 입력해주세요.' });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ userId: trimmedId, password });
      await login(response);
      Toast.show({ type: 'success', text1: '로그인 성공', text2: `${response.name}님 환영합니다!` });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data ||
        '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      Toast.show({ type: 'error', text1: '로그인 실패', text2: String(message) });
    } finally {
      setLoading(false);
    }
  };

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
        {/* Logo / Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>우리반</Text>
          <Text style={styles.subtitle}>동창을 찾고, 추억을 나누세요</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              style={styles.input}
              placeholder="아이디를 입력하세요"
              placeholderTextColor={Colors.textMuted}
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력하세요"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFE156" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Links */}
        <View style={styles.links}>
          <TouchableOpacity
            onPress={() => Toast.show({ type: 'info', text1: '준비 중', text2: '아이디 찾기 기능은 준비 중입니다' })}
            disabled={loading}
          >
            <Text style={styles.linkText}>아이디 찾기</Text>
          </TouchableOpacity>

          <View style={styles.linkDivider} />

          <TouchableOpacity
            onPress={() => Toast.show({ type: 'info', text1: '준비 중', text2: '비밀번호 찾기 기능은 준비 중입니다' })}
            disabled={loading}
          >
            <Text style={styles.linkText}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.signupSection}>
          <Text style={styles.signupPrompt}>아직 회원이 아니신가요?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
          >
            <Text style={styles.signupLink}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2D5016',
    letterSpacing: 2,
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: 14,
    color: '#8D6E63',
    marginTop: 8,
    fontFamily: Fonts.regular,
  },
  form: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 6,
    fontFamily: Fonts.regular,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E0B0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  loginButton: {
    backgroundColor: '#2D5016',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 48,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  loginButtonText: {
    color: '#FFE156',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    fontSize: 13,
    color: '#8D6E63',
  },
  linkDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.gray300,
    marginHorizontal: 14,
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  signupPrompt: {
    fontSize: 13,
    color: '#8D6E63',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D5016',
    fontFamily: Fonts.bold,
  },
});
