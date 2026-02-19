import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Profile.css';
import { userAPI, ProfileResponse } from '../api/user';
import { guestbookAPI, GuestbookResponse } from '../api/guestbook';
import { getAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 방명록 상태
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookResponse[]>([]);
  const [guestbookContent, setGuestbookContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user: currentUser } = getAuthData();
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        const data = await userAPI.getProfile(userId);
        setProfile(data);
      } catch (error) {
        console.error('프로필 조회 실패:', error);
        setModal({ type: 'error', message: '프로필을 불러오는데 실패했습니다.', onConfirm: () => setModal(null) });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    loadGuestbook();
  }, [userId]);

  const loadGuestbook = async () => {
    if (!userId) return;
    try {
      const entries = await guestbookAPI.getEntries(userId, currentUser?.userId);
      setGuestbookEntries(entries);
    } catch (error) {
      console.error('방명록 로딩 실패:', error);
    }
  };

  const handleAddGuestbook = async () => {
    if (!currentUser || !userId || !guestbookContent.trim()) return;

    try {
      setSubmitting(true);
      await guestbookAPI.addEntry(userId, currentUser.userId, { content: guestbookContent.trim() });
      setGuestbookContent('');
      await loadGuestbook();
    } catch (error) {
      console.error('방명록 작성 실패:', error);
      setModal({ type: 'error', message: '방명록 작성에 실패했습니다.', onConfirm: () => setModal(null) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGuestbook = async (entryId: number) => {
    if (!currentUser) return;

    setModal({
      type: 'confirm',
      message: '방명록을 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        setModal(null);
        try {
          await guestbookAPI.deleteEntry(entryId, currentUser.userId);
          await loadGuestbook();
          setModal({ type: 'success', message: '방명록이 삭제되었습니다.', onConfirm: () => setModal(null) });
        } catch (error) {
          console.error('방명록 삭제 실패:', error);
          setModal({ type: 'error', message: '방명록 삭제에 실패했습니다.', onConfirm: () => setModal(null) });
        }
      },
      onCancel: () => setModal(null),
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="profile-loading">로딩 중...</div>;
  }

  if (!profile) {
    return <div className="profile-error">프로필을 찾을 수 없습니다.</div>;
  }

  return (
    <>
    {modal && (
      <ConfirmationModal
        type={modal.type}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        confirmText={modal.confirmText}
      />
    )}
    <div className="profile-container">
      {/* 미니홈피 헤더 */}
      <header className="profile-header">
        <div className="profile-header-wrapper">
          <div className="profile-brand" onClick={() => navigate('/dashboard')}>
            <span className="profile-brand-icon">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="profileLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#32373c"/><stop offset="1" stopColor="#1a1d20"/></linearGradient></defs>
                <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#profileLogoGrad)"/>
                <circle cx="38" cy="32" r="10" fill="white"/><path d="M24 58c0-8 6.3-14 14-14s14 6 14 14" fill="white"/>
                <circle cx="62" cy="32" r="10" fill="white" opacity="0.85"/><path d="M48 58c0-8 6.3-14 14-14s14 6 14 14" fill="white" opacity="0.85"/>
                <rect x="20" y="66" width="60" height="4" rx="2" fill="white" opacity="0.9"/><rect x="28" y="76" width="44" height="4" rx="2" fill="white" opacity="0.6"/>
              </svg>
            </span>
            <h1>우리반</h1>
          </div>
          <button className="profile-back-btn" onClick={() => navigate(-1)}>
            ← 뒤로가기
          </button>
        </div>
      </header>

      {/* 미니홈피 메인 */}
      <div className="profile-main">
        <div className="profile-minihompy">
          {/* 왼쪽: 프로필 카드 */}
          <aside className="profile-sidebar">
            <div className="profile-card">
              <div className="profile-photo-frame">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt={profile.name} />
                ) : (
                  <div className="profile-photo-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                )}
              </div>

              <div className="profile-info">
                <h2 className="profile-name">{profile.name}</h2>
                <p className="profile-id">@{profile.userId}</p>
              </div>

              <button
                className="profile-edit-btn"
                onClick={() => navigate('/profile/edit')}
              >
                프로필 수정
              </button>
            </div>

            {/* 학교 정보 */}
            <div className="profile-schools">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#32373c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}>
                  <path d="M2 20h20" />
                  <path d="M5 20V8l7-5 7 5v12" />
                  <rect x="9" y="12" width="6" height="8" rx="1" />
                  <path d="M3 20V11l9-7 9 7v9" />
                </svg>
                학교 정보
              </h3>
              {profile.schools.map((school) => (
                <div key={school.id} className="school-item">
                  <div className="school-type">{school.schoolType}</div>
                  <div className="school-name">{school.schoolName}</div>
                  <div className="school-detail">
                    {school.graduationYear}년 졸업
                    {school.grade && school.classNumber && (
                      <> · {school.grade}학년 {school.classNumber}반</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* 오른쪽: 자기소개 & 방명록 영역 */}
          <main className="profile-content">
            {/* 자기소개 */}
            <section className="profile-bio-section">
              <div className="section-header">
                <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#32373c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>자기소개</h3>
              </div>
              <div className="bio-content">
                {profile.bio || '아직 자기소개가 없습니다.'}
              </div>
            </section>

            {/* 방명록 */}
            <section className="profile-guestbook-section">
              <div className="section-header">
                <h3><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#32373c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>방명록</h3>
                <span className="guestbook-count">({guestbookEntries.length})</span>
              </div>

              {/* 방명록 작성 */}
              {currentUser && (
                <div className="guestbook-input-area">
                  <div className="guestbook-input-header">
                    <div className="guestbook-input-avatar">
                      <span>{currentUser.name?.[0] || '?'}</span>
                    </div>
                    <span className="guestbook-input-name">{currentUser.name}</span>
                  </div>
                  <textarea
                    className="guestbook-textarea"
                    placeholder="방명록을 남겨보세요..."
                    value={guestbookContent}
                    onChange={(e) => setGuestbookContent(e.target.value)}
                    rows={3}
                    disabled={submitting}
                  />
                  <div className="guestbook-input-actions">
                    <button
                      className="guestbook-submit-btn"
                      onClick={handleAddGuestbook}
                      disabled={submitting || !guestbookContent.trim()}
                    >
                      {submitting ? '작성 중...' : '작성'}
                    </button>
                  </div>
                </div>
              )}

              {/* 방명록 목록 */}
              {guestbookEntries.length === 0 ? (
                <div className="guestbook-empty">
                  방명록이 비어있습니다.<br />
                  첫 번째 방명록을 남겨보세요!
                </div>
              ) : (
                <div className="guestbook-list">
                  {guestbookEntries.map((entry, index) => (
                    <div key={entry.id} className="guestbook-entry">
                      <div className="guestbook-entry-number">#{guestbookEntries.length - index}</div>
                      <div className="guestbook-entry-header">
                        <div className="guestbook-entry-avatar">
                          {entry.writer.profileImageUrl ? (
                            <img src={entry.writer.profileImageUrl} alt={entry.writer.name} />
                          ) : (
                            <span>{entry.writer.name[0]}</span>
                          )}
                        </div>
                        <div className="guestbook-entry-info">
                          <span
                            className="guestbook-entry-writer"
                            onClick={() => navigate(`/profile/${entry.writer.userId}`)}
                          >
                            {entry.writer.name}
                          </span>
                          <span className="guestbook-entry-date">{formatDate(entry.createdAt)}</span>
                        </div>
                        {entry.canDelete && (
                          <button
                            className="guestbook-entry-delete"
                            onClick={() => handleDeleteGuestbook(entry.id)}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      <div className="guestbook-entry-content">{entry.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="profile-footer">
        <p>© 2026 우리반 · 추억을 함께하는 공간</p>
      </footer>
    </div>
    </>
  );
};

export default Profile;
