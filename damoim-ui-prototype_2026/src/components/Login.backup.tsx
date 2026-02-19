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
      <div className="login-container">
        {/* Header */}
        <header className="login-header">
          <div className="login-brand">
            <h1 className="login-logo">우리반</h1>
          </div>
        </header>

        {/* Hero Section */}
        <section className="login-hero">
          <div className="login-hero-container">
            {/* Left Side: Marketing Text */}
            <div className="login-hero-text">
              <h1 className="login-hero-title">
                학창시절 친구들과<br />
                <span>다시 만나다</span>
              </h1>
              <p className="login-hero-desc">
                추억을 공유하고 새로운 이야기를 시작하세요.
              </p>
            </div>

            {/* Right Side: Glassmorphic Login Card */}
            <div className="login-warm-card">
              <div className="login-card-header">
                <h3>로그인</h3>
                <p className="login-card-subtitle">계정에 로그인하여 시작하세요</p>
              </div>

              {/* Login Form */}
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
                    autoComplete="username"
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
                    autoComplete="current-password"
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
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate('/find-id'); }}>
                    아이디 찾기
                  </a>
                  <span>|</span>
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate('/find-password'); }}>
                    비밀번호 찾기
                  </a>
                  <span>|</span>
                  <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>
                    회원가입
                  </a>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
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
