import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { authAPI } from '../api/auth';
import ConfirmationModal from './ConfirmationModal';

type Step = 'verify' | 'reset' | 'done';

const FindPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('verify');
  const [verifyData, setVerifyData] = useState({ userId: '', email: '' });
  const [resetData, setResetData] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ type: 'success' | 'error'; message: string; onConfirm: () => void } | null>(null);

  const handleVerifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerifyData({ ...verifyData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyData.userId || !verifyData.email) {
      setModal({ type: 'error', message: '아이디와 이메일을 모두 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyIdentity({ userId: verifyData.userId, email: verifyData.email });
      setStep('reset');
    } catch (error: any) {
      const errorMessage = error.response?.data || '일치하는 회원 정보를 찾을 수 없습니다.';
      setModal({ type: 'error', message: errorMessage, onConfirm: () => setModal(null) });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetData.newPassword || !resetData.confirmPassword) {
      setModal({ type: 'error', message: '새 비밀번호를 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }
    if (resetData.newPassword.length < 6) {
      setModal({ type: 'error', message: '비밀번호는 최소 6자 이상이어야 합니다.', onConfirm: () => setModal(null) });
      return;
    }
    if (resetData.newPassword !== resetData.confirmPassword) {
      setModal({ type: 'error', message: '비밀번호가 일치하지 않습니다.', onConfirm: () => setModal(null) });
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        userId: verifyData.userId,
        email: verifyData.email,
        newPassword: resetData.newPassword,
      });
      setStep('done');
    } catch (error: any) {
      const errorMessage = error.response?.data || '비밀번호 변경에 실패했습니다.';
      setModal({ type: 'error', message: errorMessage, onConfirm: () => setModal(null) });
    } finally {
      setLoading(false);
    }
  };

  const getHeroTitle = () => {
    switch (step) {
      case 'verify': return <>비밀번호를<br />잊으셨나요?</>;
      case 'reset': return <>새 비밀번호를<br />설정하세요</>;
      case 'done': return <>비밀번호가<br />변경되었습니다</>;
    }
  };

  const getHeroDesc = () => {
    switch (step) {
      case 'verify': return '가입 시 등록한 아이디와 이메일로 본인 확인 후 비밀번호를 변경할 수 있습니다';
      case 'reset': return '안전한 비밀번호를 설정해주세요 (최소 6자)';
      case 'done': return '새 비밀번호로 로그인해주세요';
    }
  };

  const getCardTitle = () => {
    switch (step) {
      case 'verify': return '본인 확인';
      case 'reset': return '새 비밀번호 설정';
      case 'done': return '변경 완료';
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
                  <defs><linearGradient id="findPwLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#f97316"/><stop offset="1" stopColor="#e04e0a"/></linearGradient></defs>
                  <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#findPwLogoGrad)"/>
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
              <span className="login-hero-badge">비밀번호 찾기</span>
              <h1 className="login-hero-title">{getHeroTitle()}</h1>
              <p className="login-hero-desc">{getHeroDesc()}</p>
            </div>

            <div className="login-warm-card">
              <div className="login-card-header">
                <h3>{getCardTitle()}</h3>
              </div>

              {step === 'verify' && (
                <form className="login-card-body" onSubmit={handleVerify}>
                  <div className="login-input-group">
                    <label>아이디</label>
                    <input
                      type="text"
                      name="userId"
                      placeholder="가입한 아이디"
                      className="login-input"
                      value={verifyData.userId}
                      onChange={handleVerifyChange}
                    />
                  </div>
                  <div className="login-input-group">
                    <label>이메일</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="가입 시 등록한 이메일"
                      className="login-input"
                      value={verifyData.email}
                      onChange={handleVerifyChange}
                    />
                  </div>
                  <button type="submit" className="login-btn-submit" disabled={loading}>
                    {loading ? '확인 중...' : '다음'}
                  </button>
                  <div className="login-links">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>로그인</a>
                    <span>|</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/find-id'); }}>아이디 찾기</a>
                    <span>|</span>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>회원가입</a>
                  </div>
                </form>
              )}

              {step === 'reset' && (
                <form className="login-card-body" onSubmit={handleResetPassword}>
                  <div style={{
                    background: '#fffbf5',
                    border: '2px solid #fed7aa',
                    borderRadius: 12,
                    padding: '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    fontSize: 14,
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    {verifyData.userId} ({verifyData.email})
                  </div>
                  <div className="login-input-group">
                    <label>새 비밀번호</label>
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="새 비밀번호 (최소 6자)"
                      className="login-input"
                      value={resetData.newPassword}
                      onChange={handleResetChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="login-input-group">
                    <label>비밀번호 확인</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="비밀번호 다시 입력"
                      className="login-input"
                      value={resetData.confirmPassword}
                      onChange={handleResetChange}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="login-btn-submit"
                    disabled={loading}
                  >
                    {loading ? '변경 중...' : '비밀번호 변경'}
                  </button>
                  <div className="login-links">
                    <a href="#" onClick={(e) => { e.preventDefault(); setStep('verify'); }}>이전 단계</a>
                  </div>
                </form>
              )}

              {step === 'done' && (
                <div className="login-card-body">
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem 0',
                  }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      margin: '0 auto 1.5rem',
                      background: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </div>
                    <p style={{ color: '#166534', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                      비밀번호가 변경되었습니다
                    </p>
                    <p style={{ color: '#92400e', fontSize: 14 }}>
                      새 비밀번호로 로그인해주세요
                    </p>
                  </div>

                  <button
                    className="login-btn-submit"
                    onClick={() => navigate('/login')}
                  >
                    로그인으로
                  </button>
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

export default FindPassword;
