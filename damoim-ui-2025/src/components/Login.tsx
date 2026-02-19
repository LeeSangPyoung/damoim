import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { authAPI } from '../api/auth';
import { saveAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId || !formData.password) {
      setModal({ type: 'error', message: '아이디와 비밀번호를 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({
        userId: formData.userId,
        password: formData.password,
      });

      saveAuthData(response);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('로그인 실패:', error);
      const errorMessage = error.response?.data || '로그인에 실패했습니다.';
      setModal({ type: 'error', message: errorMessage, onConfirm: () => setModal(null) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {modal && (
        <ConfirmationModal
          type={modal.type}
          message={modal.message}
          onConfirm={modal.onConfirm}
        />
      )}
      
      <div className="login-notion-clean">
        <div className="notion-wrapper">
          {/* 로고 영역 */}
          <div className="notion-brand">
            <div className="brand-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 학교 건축물 - 만화 선화 스타일 */}
                <path d="M24 4L4 20H8V40H20V28H28V40H40V20H44L24 4Z" stroke="#37352f" strokeWidth="2" fill="none"/>
                <path d="M8 20H40" stroke="#37352f" strokeWidth="1.5"/>
                {/* 중앙 탑 */}
                <path d="M20 12H28V20H20V12Z" stroke="#37352f" strokeWidth="1.5" fill="none"/>
                <path d="M24 6V12" stroke="#37352f" strokeWidth="1.5"/>
                {/* 창문들 */}
                <rect x="12" y="24" width="6" height="8" stroke="#37352f" strokeWidth="1.5" fill="none"/>
                <rect x="30" y="24" width="6" height="8" stroke="#37352f" strokeWidth="1.5" fill="none"/>
                <rect x="21" y="24" width="6" height="8" stroke="#37352f" strokeWidth="1.5" fill="none"/>
                {/* 문 */}
                <path d="M20 40V32H28V40" stroke="#37352f" strokeWidth="1.5" fill="none"/>
                {/* 지붕 선 */}
                <path d="M4 20L24 4L44 20" stroke="#37352f" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="brand-name">우리반</h1>
          </div>

          {/* 로그인 폼 */}
          <div className="notion-form-box">
            <h2 className="form-title">로그인</h2>
            
            <form className="notion-form" onSubmit={handleLogin}>
              <div className="input-wrapper">
                <label className="input-label">아이디 또는 이메일</label>
                <input
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="아이디를 입력하세요"
                  required
                  className="notion-input"
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label">비밀번호</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="••••••••"
                  required
                  className="notion-input"
                />
              </div>

              <button type="submit" className="notion-submit" disabled={loading}>
                {loading ? '로그인 중...' : '계속하기'}
              </button>
            </form>
          </div>

          {/* 하단 링크 */}
          <div className="notion-footer">
            <p className="footer-text">
              계정이 없으신가요?{' '}
              <button onClick={() => navigate('/signup')} className="footer-link">
                회원가입
              </button>
            </p>
            <div className="footer-links">
              <button onClick={() => navigate('/find-id')} className="footer-link-small">
                아이디 찾기
              </button>
              <span className="link-dot">·</span>
              <button onClick={() => navigate('/find-password')} className="footer-link-small">
                비밀번호 재설정
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
