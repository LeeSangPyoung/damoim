import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { userAPI, ClassmateInfo, ProfileResponse } from '../api/user';
import { friendAPI, FriendshipStatus } from '../api/friend';
import { getAuthData } from '../utils/auth';
import ProfileModal from './ProfileModal';
import ComposeMessageModal from './ComposeMessageModal';
import './ClassmateList.css';

export default function ClassmateList() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [classmates, setClassmates] = useState<ClassmateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [friendActionLoading, setFriendActionLoading] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileResponse | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<{ id: string; name: string } | null>(null);

  const schoolCode = searchParams.get('schoolCode') || '';
  const schoolName = searchParams.get('schoolName') || '';
  const graduationYear = searchParams.get('year') || '';
  const schoolType = searchParams.get('type') || '';

  useEffect(() => {
    loadClassmates();
  }, [schoolCode, graduationYear]);

  const loadClassmates = async () => {
    const { user } = getAuthData();
    if (!user || !schoolCode) return;

    try {
      setLoading(true);
      const data = await userAPI.searchClassmates(user.userId, schoolCode, graduationYear);
      setClassmates(data.classmates);

      if (data.classmates.length > 0) {
        const targetIds = data.classmates.map(c => c.userId);
        const statuses = await friendAPI.getStatuses(user.userId, targetIds);
        setFriendStatuses(statuses);
      }
    } catch (error) {
      console.error('동창 목록 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendAction = async (targetUserId: string) => {
    const { user } = getAuthData();
    if (!user || friendActionLoading) return;

    const status = friendStatuses[targetUserId];
    setFriendActionLoading(targetUserId);

    try {
      if (!status || status.status === 'NONE') {
        const mate = classmates.find(c => c.userId === targetUserId);
        if (!window.confirm(`${mate?.name || targetUserId}님에게 친구 요청을 보내시겠습니까?`)) {
          setFriendActionLoading(null);
          return;
        }
        const resp = await friendAPI.sendRequest(user.userId, targetUserId);
        setFriendStatuses(prev => ({
          ...prev,
          [targetUserId]: { status: 'SENT', friendshipId: resp.friendshipId }
        }));
      } else if (status.status === 'RECEIVED' && status.friendshipId) {
        await friendAPI.acceptRequest(status.friendshipId, user.userId);
        setFriendStatuses(prev => ({
          ...prev,
          [targetUserId]: { status: 'FRIEND', friendshipId: status.friendshipId }
        }));
      } else if (status.status === 'FRIEND' && status.friendshipId) {
        if (!window.confirm('친구를 삭제하시겠습니까?')) {
          setFriendActionLoading(null);
          return;
        }
        await friendAPI.removeFriendship(status.friendshipId, user.userId);
        setFriendStatuses(prev => ({
          ...prev,
          [targetUserId]: { status: 'NONE' }
        }));
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || '처리 실패');
    } finally {
      setFriendActionLoading(null);
    }
  };

  const handleProfileClick = async (userId: string) => {
    try {
      const profileData = await userAPI.getProfile(userId);
      setSelectedProfile(profileData);
    } catch (error) {
      console.error('프로필 로드 실패:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '초등학교': return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case '중학교': return { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' };
      case '고등학교': return { bg: '#f5f3ff', color: '#7c3aed', border: '#c4b5fd' };
      default: return { bg: '#f9fafb', color: '#6b7280', border: '#d1d5db' };
    }
  };

  const theme = getTypeColor(schoolType);

  const renderFriendBadge = (userId: string) => {
    const status = friendStatuses[userId];
    if (!status) return null;

    switch (status.status) {
      case 'FRIEND':
        return (
          <span className="cl-friend-badge cl-badge-friend" onClick={(e) => { e.stopPropagation(); handleFriendAction(userId); }} title="클릭하여 친구 삭제">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
            친구
          </span>
        );
      case 'SENT':
        return <span className="cl-friend-badge cl-badge-sent">요청됨</span>;
      case 'RECEIVED':
        return (
          <span className="cl-friend-badge cl-badge-received" onClick={(e) => { e.stopPropagation(); handleFriendAction(userId); }}>
            수락
          </span>
        );
      default:
        return null;
    }
  };

  const renderFriendBtn = (userId: string) => {
    const status = friendStatuses[userId];
    if (status && status.status !== 'NONE') return null;

    return (
      <button
        className="cl-action-btn cl-friend-add-btn"
        onClick={(e) => { e.stopPropagation(); handleFriendAction(userId); }}
        disabled={friendActionLoading === userId}
        title="친구 신청"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="cl-container">
        <div className="cl-loading">
          <div className="cl-spinner" />
          <p>동창 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cl-container">
      <div className="cl-header">
        <button className="cl-back" onClick={() => navigate('/dashboard')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          돌아가기
        </button>
        <div className="cl-title-row">
          <span className="cl-type-badge" style={{ background: theme.bg, color: theme.color, borderColor: theme.border }}>
            {schoolType}
          </span>
          <h2>{schoolName}</h2>
        </div>
        <p className="cl-subtitle">{graduationYear}년 졸업 · 동창 {classmates.length}명</p>
      </div>

      {classmates.length === 0 ? (
        <div className="cl-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p>아직 등록된 동창이 없습니다.</p>
        </div>
      ) : (
        <div className="cl-grid">
          {classmates.map((mate) => (
            <div key={mate.id} className="cl-card" onClick={() => handleProfileClick(mate.userId)}>
              <div className="cl-avatar" style={{ background: theme.bg, color: theme.color }}>
                {mate.profileImageUrl ? (
                  <img src={mate.profileImageUrl} alt={mate.name} />
                ) : (
                  <span>{mate.name.charAt(0)}</span>
                )}
              </div>
              <div className="cl-info">
                <div className="cl-name-row">
                  <span className="cl-name">{mate.name}</span>
                  {renderFriendBadge(mate.userId)}
                </div>
                {mate.school && (
                  <div className="cl-school-detail">
                    {mate.school.grade && `${mate.school.grade}학년`}
                    {mate.school.classNumber && ` ${mate.school.classNumber}반`}
                  </div>
                )}
                {mate.bio && <div className="cl-bio">{mate.bio}</div>}
              </div>
              {renderFriendBtn(mate.userId)}
              <button
                className="cl-action-btn cl-msg-btn"
                style={{ color: theme.color }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/chat?userId=${mate.userId}&name=${encodeURIComponent(mate.name)}`);
                }}
                title="쪽지 보내기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSendMessage={() => {
            setComposeRecipient({ id: selectedProfile.userId, name: selectedProfile.name });
            setShowComposeModal(true);
          }}
        />
      )}

      {showComposeModal && (
        <ComposeMessageModal
          recipientId={composeRecipient?.id}
          recipientName={composeRecipient?.name}
          onClose={() => {
            setShowComposeModal(false);
            setComposeRecipient(null);
          }}
        />
      )}
    </div>
  );
}
