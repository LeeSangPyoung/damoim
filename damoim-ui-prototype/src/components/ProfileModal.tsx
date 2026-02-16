import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfileModal.css';
import { ProfileResponse } from '../api/user';
import { chatAPI } from '../api/chat';
import { friendAPI, FriendshipStatus } from '../api/friend';
import { getAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';

interface ProfileModalProps {
  profile: ProfileResponse;
  onClose: () => void;
  onSendMessage?: () => void;
  onFriendStatusChange?: (userId: string, status: FriendshipStatus) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose, onSendMessage, onFriendStatusChange }) => {
  const navigate = useNavigate();
  const { user: currentUser } = getAuthData();
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus>({ status: 'NONE' });
  const [friendLoading, setFriendLoading] = useState(false);
  const [modal, setModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isMyProfile = currentUser?.userId === profile.userId;

  useEffect(() => {
    if (currentUser && !isMyProfile) {
      friendAPI.getStatus(currentUser.userId, profile.userId)
        .then(setFriendStatus)
        .catch(() => {});
    }
  }, [profile.userId]);

  const handleStartChat = async () => {
    if (!currentUser) return;
    try {
      const data = await chatAPI.createOrGetRoom(currentUser.userId, profile.userId);
      onClose();
      navigate(`/chat?roomId=${data.roomId}`);
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || friendLoading) return;
    setFriendLoading(true);
    try {
      const resp = await friendAPI.sendRequest(currentUser.userId, profile.userId);
      const newStatus: FriendshipStatus = { status: 'SENT', friendshipId: resp.friendshipId };
      setFriendStatus(newStatus);
      onFriendStatusChange?.(profile.userId, newStatus);
      setModal({ type: 'success', message: `${profile.name}님에게 친구 요청을 보냈습니다.` });
    } catch (error: any) {
      setModal({ type: 'error', message: error?.response?.data?.error || '친구 요청 실패' });
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentUser || !friendStatus.friendshipId || friendLoading) return;
    setFriendLoading(true);
    try {
      await friendAPI.acceptRequest(friendStatus.friendshipId, currentUser.userId);
      const newStatus: FriendshipStatus = { status: 'FRIEND', friendshipId: friendStatus.friendshipId };
      setFriendStatus(newStatus);
      onFriendStatusChange?.(profile.userId, newStatus);
      setModal({ type: 'success', message: `${profile.name}님과 친구가 되었습니다.` });
    } catch (error: any) {
      setModal({ type: 'error', message: error?.response?.data?.error || '수락 실패' });
    } finally {
      setFriendLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!currentUser || !friendStatus.friendshipId || friendLoading) return;
    setFriendLoading(true);
    try {
      await friendAPI.removeFriendship(friendStatus.friendshipId, currentUser.userId);
      const newStatus: FriendshipStatus = { status: 'NONE' };
      setFriendStatus(newStatus);
      onFriendStatusChange?.(profile.userId, newStatus);
      setModal({ type: 'success', message: '친구 요청을 취소했습니다.' });
    } catch (error: any) {
      setModal({ type: 'error', message: error?.response?.data?.error || '요청 취소 실패' });
    } finally {
      setFriendLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!currentUser || !friendStatus.friendshipId || friendLoading) return;
    if (!window.confirm('친구를 삭제하시겠습니까?')) return;
    setFriendLoading(true);
    try {
      await friendAPI.removeFriendship(friendStatus.friendshipId, currentUser.userId);
      const newStatus: FriendshipStatus = { status: 'NONE' };
      setFriendStatus(newStatus);
      onFriendStatusChange?.(profile.userId, newStatus);
      setModal({ type: 'success', message: '친구가 삭제되었습니다.' });
    } catch (error: any) {
      setModal({ type: 'error', message: error?.response?.data?.error || '삭제 실패' });
    } finally {
      setFriendLoading(false);
    }
  };

  const renderFriendButton = () => {
    if (isMyProfile) return null;

    switch (friendStatus.status) {
      case 'FRIEND':
        return (
          <div className="pm-friend-section pm-friend-connected">
            <div className="pm-friend-status-row">
              <div className="pm-friend-badge">
                <span className="pm-friend-badge-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </span>
                우리는 친구
              </div>
              <button className="pm-friend-remove" onClick={handleRemoveFriend} disabled={friendLoading}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
                해제
              </button>
            </div>
          </div>
        );
      case 'SENT':
        return (
          <div className="pm-friend-section pm-friend-pending">
            <div className="pm-friend-status-row">
              <div className="pm-friend-sent">
                <span className="pm-friend-sent-dot" />
                수락 대기 중
              </div>
              <button className="pm-friend-cancel" onClick={handleCancelRequest} disabled={friendLoading}>
                요청 취소
              </button>
            </div>
          </div>
        );
      case 'RECEIVED':
        return (
          <div className="pm-friend-section pm-friend-incoming">
            <p className="pm-friend-incoming-text">{profile.name}님이 친구 요청을 보냈어요!</p>
            <button className="pm-friend-accept" onClick={handleAcceptRequest} disabled={friendLoading}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 6 9 17l-5-5"/></svg>
              수락하기
            </button>
          </div>
        );
      default:
        return (
          <div className="pm-friend-section">
            <button className="pm-friend-add" onClick={handleSendFriendRequest} disabled={friendLoading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              친구 신청
            </button>
          </div>
        );
    }
  };

  return (
    <>
    {modal && (
      <ConfirmationModal
        type={modal.type}
        message={modal.message}
        onConfirm={() => setModal(null)}
      />
    )}
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
        </button>

        {/* 프로필 헤더 */}
        <div className="profile-modal-header">
          <div className="profile-modal-avatar">
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt={profile.name} />
            ) : (
              <span>{profile.name[0]}</span>
            )}
          </div>
          <div className="profile-modal-info">
            <div className="pm-name-row">
              <h2>{profile.name}</h2>
              {friendStatus.status === 'FRIEND' && (
                <span className="pm-friend-inline-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  친구
                </span>
              )}
            </div>
            <p className="profile-modal-userid">@{profile.userId}</p>
          </div>
        </div>

        {/* 친구 버튼 영역 */}
        {renderFriendButton()}

        {/* 자기소개 */}
        <div className="profile-modal-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            자기소개
          </h3>
          <div className="profile-modal-bio-card">
            {profile.bio ? (
              <p className="profile-modal-bio">{profile.bio}</p>
            ) : (
              <p className="profile-modal-bio-empty">아직 자기소개를 작성하지 않았어요.</p>
            )}
          </div>
        </div>

        {/* 학력 */}
        <div className="profile-modal-section">
          <h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}>
              <path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><rect x="9" y="12" width="6" height="8" rx="1"/>
            </svg>
            학력
          </h3>
          <div className="profile-modal-schools">
            {(() => {
              const grouped = new Map<string, typeof profile.schools>();
              profile.schools.forEach((school) => {
                const key = `${school.schoolName}||${school.graduationYear}`;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(school);
              });

              return Array.from(grouped.entries()).map(([key, schools]) => {
                const [schoolName, graduationYear] = key.split('||');
                return (
                  <div key={key} className="profile-modal-school-card">
                    <div className="profile-modal-school-icon">
                      <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="92" height="92" rx="20" fill="url(#schoolGrad)" />
                        <defs>
                          <linearGradient id="schoolGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f97316" />
                            <stop offset="1" stopColor="#e04e0a" />
                          </linearGradient>
                        </defs>
                        <rect x="18" y="40" width="64" height="42" rx="4" fill="white" />
                        <path d="M10 42 L50 14 L90 42" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <rect x="26" y="50" width="14" height="12" rx="2" fill="#f97316" opacity="0.45" />
                        <rect x="60" y="50" width="14" height="12" rx="2" fill="#f97316" opacity="0.45" />
                        <rect x="42" y="56" width="16" height="26" rx="3" fill="#f97316" opacity="0.6" />
                        <circle cx="50" cy="14" r="4" fill="white" />
                      </svg>
                    </div>
                    <div className="profile-modal-school-info">
                      <h4>{schoolName}</h4>
                      <p>{graduationYear}년 졸업</p>
                      <div className="profile-modal-school-classes">
                        {schools
                          .filter(s => s.grade && s.classNumber)
                          .sort((a, b) => Number(a.grade) - Number(b.grade))
                          .map((s) => (
                            <span key={s.id} className="profile-modal-school-class-tag">
                              {s.grade}학년 {s.classNumber}반
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* 액션 버튼 */}
        {!isMyProfile && (
          <div className="profile-modal-actions">
            <button
              className="profile-modal-btn profile-modal-btn-primary"
              onClick={onSendMessage}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              쪽지 보내기
            </button>
            <button className="profile-modal-btn profile-modal-btn-secondary" onClick={handleStartChat}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              채팅하기
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ProfileModal;
