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
      // API 호출
      const response = await authAPI.login({
        userId: formData.userId,
        password: formData.password,
      });

      // 토큰 및 사용자 정보 저장
      saveAuthData(response);

      // 대시보드로 이동
      navigate('/dashboard');
    } catch (error: any) {
      console.error('로그인 실패:', error);
      const errorMessage = error.response?.data || '로그인에 실패했습니다.';
      setModal({ type: 'error', message: errorMessage, onConfirm: () => setModal(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate('/signup');
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
    <div className="login-container">
      {/* Warm header */}
      <header className="login-header">
        <div className="login-header-wrapper">
          <div className="login-brand">
            <span className="login-brand-icon">
              <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="loginLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#f97316"/><stop offset="1" stopColor="#e04e0a"/></linearGradient></defs>
                <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#loginLogoGrad)"/>
                <circle cx="38" cy="32" r="10" fill="white"/><path d="M24 58c0-8 6.3-14 14-14s14 6 14 14" fill="white"/>
                <circle cx="62" cy="32" r="10" fill="white" opacity="0.85"/><path d="M48 58c0-8 6.3-14 14-14s14 6 14 14" fill="white" opacity="0.85"/>
                <rect x="20" y="66" width="60" height="4" rx="2" fill="white" opacity="0.9"/><rect x="28" y="76" width="44" height="4" rx="2" fill="white" opacity="0.6"/>
              </svg>
            </span>
            <h1 className="login-logo">우리반</h1>
          </div>
        </div>
      </header>

      {/* Hero with login form */}
      <section className="login-hero">
        <div className="login-hero-container">
          <div className="login-hero-text">
            <span className="login-hero-badge">추억의 재회</span>
            <h1 className="login-hero-title">
              따뜻한 추억과<br />
              다시 만나는 시간
            </h1>
            <p className="login-hero-desc">
              학창시절의 소중했던 친구들과 다시 연결되세요
            </p>
          </div>

          {/* Login Form Card */}
          <div className="login-warm-card">
            <div className="login-card-header">
              <h3>로그인</h3>
            </div>
            <form className="login-card-body" onSubmit={handleLogin}>
              <div className="login-input-group">
                <label>아이디</label>
                <input
                  type="text"
                  name="userId"
                  placeholder="아이디를 입력하세요"
                  className="login-input"
                  value={formData.userId}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="login-input-group">
                <label>비밀번호</label>
                <input
                  type="password"
                  name="password"
                  placeholder="비밀번호를 입력하세요"
                  className="login-input"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="login-btn-submit"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>

              <div className="login-links">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/find-id'); }}>아이디 찾기</a>
                <span>|</span>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/find-password'); }}>비밀번호 찾기</a>
                <span>|</span>
                <a href="/signup" onClick={handleSignupClick}>회원가입</a>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="login-footer">
        <div className="login-footer-content">
          <p>© 2026 우리반 · 모든 권리 보유</p>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Login;
