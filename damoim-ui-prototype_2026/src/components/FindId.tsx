import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { authAPI } from '../api/auth';
import ConfirmationModal from './ConfirmationModal';

const FindId: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: 'success' | 'error'; message: string; onConfirm: () => void } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      setModal({ type: 'error', message: '이름과 이메일을 모두 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.findId({ name: formData.name, email: formData.email });
      setResult(response.maskedUserId);
    } catch (error: any) {
      const errorMessage = error.response?.data || '일치하는 회원 정보를 찾을 수 없습니다.';
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
        <header className="login-header">
          <div className="login-header-wrapper">
            <div className="login-brand" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>
              <span className="login-brand-icon">
                <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs><linearGradient id="findIdLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#32373c"/><stop offset="1" stopColor="#1a1d20"/></linearGradient></defs>
                  <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#findIdLogoGrad)"/>
                  <circle cx="38" cy="32" r="10" fill="white"/><path d="M24 58c0-8 6.3-14 14-14s14 6 14 14" fill="white"/>
                  <circle cx="62" cy="32" r="10" fill="white" opacity="0.85"/><path d="M48 58c0-8 6.3-14 14-14s14 6 14 14" fill="white" opacity="0.85"/>
                  <rect x="20" y="66" width="60" height="4" rx="2" fill="white" opacity="0.9"/><rect x="28" y="76" width="44" height="4" rx="2" fill="white" opacity="0.6"/>
                </svg>
              </span>
              <h1 className="login-logo">우리반</h1>
            </div>
          </div>
        </header>

        <section className="login-hero">
          <div className="login-hero-container" style={{ gridTemplateColumns: '1fr 450px' }}>
            <div className="login-hero-text">
              <span className="login-hero-badge">아이디 찾기</span>
              <h1 className="login-hero-title">
                아이디를<br />
                잊으셨나요?
              </h1>
              <p className="login-hero-desc">
                가입 시 등록한 이름과 이메일로 아이디를 찾을 수 있습니다
              </p>
            </div>

            <div className="login-warm-card">
              <div className="login-card-header">
                <h3>아이디 찾기</h3>
              </div>

              {!result ? (
                <form className="login-card-body" onSubmit={handleSubmit}>
                  <div className="login-input-group">
                    <label>이름</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="가입 시 등록한 이름"
                      className="login-input"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="login-input-group">
                    <label>이메일</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="가입 시 등록한 이메일"
                      className="login-input"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="login-btn-submit"
                    disabled={loading}
                  >
                    {loading ? '조회 중...' : '아이디 찾기'}
                  </button>
                  <div className="login-links">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>로그인</a>
                    <span>|</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/find-password'); }}>비밀번호 찾기</a>
                    <span>|</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>회원가입</a>
                  </div>
                </form>
              ) : (
                <div className="login-card-body">
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem 0',
                  }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      margin: '0 auto 1.5rem',
                      background: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <p style={{ color: '#92400e', fontSize: 15, marginBottom: 8 }}>회원님의 아이디는</p>
                    <p style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: '#78350f',
                      letterSpacing: '2px',
                      margin: '0.5rem 0 1.5rem',
                      background: '#fffbf5',
                      border: '2px solid #d1d5db',
                      borderRadius: 12,
                      padding: '1rem',
                    }}>
                      {result}
                    </p>
                    <p style={{ color: '#92400e', fontSize: 14, marginBottom: '2rem' }}>입니다</p>
                  </div>

                  <button
                    className="login-btn-submit"
                    onClick={() => navigate('/login')}
                  >
                    로그인으로
                  </button>
                  <div className="login-links">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/find-password'); }}>비밀번호 찾기</a>
                    <span>|</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>회원가입</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="login-footer">
          <div className="login-footer-content">
            <p>&copy; 2026 우리반 &middot; 모든 권리 보유</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default FindId;
