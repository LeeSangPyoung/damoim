import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';
import { authAPI } from '../api/auth';
import ConfirmationModal from './ConfirmationModal';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void } | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.userId || !formData.password || !formData.passwordConfirm) {
        setModal({ type: 'error', message: '모든 필드를 입력해주세요.', onConfirm: () => setModal(null) });
        return;
      }
      if (formData.password !== formData.passwordConfirm) {
        setModal({ type: 'error', message: '비밀번호가 일치하지 않습니다.', onConfirm: () => setModal(null) });
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      setModal({ type: 'error', message: '모든 필드를 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.signup({
        userId: formData.userId,
        password: formData.password,
        name: formData.name,
        email: formData.email,
        schools: [],
      });

      setModal({ 
        type: 'success', 
        message: '회원가입이 완료되었습니다!', 
        onConfirm: () => navigate('/login') 
      });
    } catch (error: any) {
      setModal({ 
        type: 'error', 
        message: error.response?.data || '회원가입에 실패했습니다.', 
        onConfirm: () => setModal(null) 
      });
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
      
      <div className="signup-notion">
        <div className="signup-wrapper">
          {/* 로고 */}
          <div className="signup-brand">
            <div className="mini-logo">
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L4 20H8V40H20V28H28V40H40V20H44L24 4Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <span>우리반</span>
          </div>

          {/* 폼 박스 */}
          <div className="signup-box">
            <h1 className="signup-title">회원가입</h1>
            
            {step === 1 ? (
              <>
                <p className="signup-step">Step 1 / 2</p>
                
                <div className="signup-form">
                  <div className="input-group">
                    <label>아이디</label>
                    <input
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      placeholder="아이디를 입력하세요"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>비밀번호</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>비밀번호 확인</label>
                    <input
                      type="password"
                      name="passwordConfirm"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <button className="signup-btn" onClick={handleNext}>
                    다음
                  </button>
                </div>
              </>
            ) : (
              <form className="signup-form" onSubmit={handleSubmit}>
                <p className="signup-step">Step 2 / 2</p>
                
                <div className="input-group">
                  <label>이름</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="실명을 입력하세요"
                    required
                  />
                </div>

                <div className="input-group">
                  <label>이메일</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="btn-group">
                  <button type="button" className="back-btn" onClick={() => setStep(1)}>
                    이전
                  </button>
                  <button type="submit" className="signup-btn" disabled={loading}>
                    {loading ? '가입 중...' : '가입하기'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 하단 링크 */}
          <div className="signup-footer">
            <p>이미 계정이 있으신가요? <button onClick={() => navigate('/login')} className="login-link">로그인</button></p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
