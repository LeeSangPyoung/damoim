import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Search.css';
import { getAuthData } from '../utils/auth';
import { userAPI, ClassmateInfo, ProfileResponse } from '../api/user';
import { friendAPI, FriendshipStatus } from '../api/friend';
import ProfileModal from './ProfileModal';
import ComposeMessageModal from './ComposeMessageModal';

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(' ', 'T'));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  // 오래된 경우 날짜 표시
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const Search = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ userId: string; name: string; email: string } | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileResponse | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<{ id: string; name: string } | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [friendActionLoading, setFriendActionLoading] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [classmates, setClassmates] = useState<ClassmateInfo[]>([]);
  const [userSchools, setUserSchools] = useState<Array<{ schoolCode?: string; graduationYear?: number; grade?: number; classNumber?: number }>>([]);

  // 검색 필터
  const [searchName, setSearchName] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchClassFilter, setSearchClassFilter] = useState<'전체' | '같은반'>('전체');
  const [searchOnlineStatus, setSearchOnlineStatus] = useState<'전체' | '접속중' | '비접속중'>('전체');

  // 검색 결과
  const [results, setResults] = useState<ClassmateInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const { user: userData } = getAuthData();
    if (userData) {
      setUser(userData);
      loadOnlineClassmates(userData.userId);
    }
  }, []);

  const loadOnlineClassmates = async (userId: string) => {
    try {
      const profileData = await userAPI.getProfile(userId);
      if (profileData.schools && profileData.schools.length > 0) {
        // 현재 사용자의 학교 정보 저장 (같은 반 필터용)
        setUserSchools(profileData.schools.map(s => ({
          schoolCode: s.schoolCode,
          graduationYear: s.graduationYear ? Number(s.graduationYear) : undefined,
          grade: s.grade ? Number(s.grade) : undefined,
          classNumber: s.classNumber ? Number(s.classNumber) : undefined,
        })));

        const onlineMap = new Map<string, ClassmateInfo>();

        // 모든 학교 동창 병렬 로드
        const searchPromises = profileData.schools
          .filter(s => s.schoolCode && s.graduationYear)
          .map(s =>
            userAPI.searchClassmates(userId, s.schoolCode!, s.graduationYear!.toString())
              .catch(() => ({ classmates: [], totalCount: 0 }))
          );

        const allResults = await Promise.all(searchPromises);
        for (const result of allResults) {
          for (const c of result.classmates) {
            if (!onlineMap.has(c.userId)) onlineMap.set(c.userId, c);
          }
        }

        const allOnline = Array.from(onlineMap.values());
        setClassmates(allOnline);
        setOnlineCount(allOnline.length);
      }
    } catch (error) {
      console.error('접속 중인 동창 로드 실패:', error);
    }
  };

  const handleSearch = async () => {
    if (!user) return;

    setLoading(true);
    setSearched(true);
    try {
      const response = await userAPI.searchUsers({
        currentUserId: user.userId,
        name: searchName || undefined,
        schoolName: searchSchool || undefined,
        graduationYear: searchYear || undefined,
      });
      setResults(response.classmates);
      setTotalCount(response.totalCount);

      // 일괄 친구 상태 조회
      if (response.classmates.length > 0) {
        const targetIds = response.classmates.map(c => c.userId);
        const statuses = await friendAPI.getStatuses(user.userId, targetIds);
        setFriendStatuses(statuses);
      }
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchName('');
    setSearchSchool('');
    setSearchYear('');
    setSearchClassFilter('전체');
    setSearchOnlineStatus('전체');
    setResults([]);
    setTotalCount(0);
    setSearched(false);
    setFriendStatuses({});
  };

  const handleFriendAction = async (targetUserId: string, targetName: string) => {
    if (!user || friendActionLoading) return;

    const status = friendStatuses[targetUserId];
    setFriendActionLoading(targetUserId);

    try {
      if (!status || status.status === 'NONE') {
        if (!window.confirm(`${targetName}님에게 친구 요청을 보내시겠습니까?`)) {
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

  return (
    <div className="search-main">
          <h2 className="search-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '6px'}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            동창 찾기
          </h2>

          <div className="search-filters">
            <div className="search-filter-row">
              <input
                type="text"
                placeholder="이름으로 검색"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="search-filter-row">
              <input
                type="text"
                placeholder="학교명 (예: 중마초등학교)"
                value={searchSchool}
                onChange={(e) => setSearchSchool(e.target.value)}
                className="search-input"
              />
              <input
                type="text"
                placeholder="졸업년도 (예: 1996)"
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                className="search-input search-input-small"
              />
            </div>

            <div className="search-status-filter">
              <div className="search-status-buttons">
                <button type="button" className={`search-status-btn ${searchClassFilter === '전체' ? 'active' : ''}`} onClick={() => setSearchClassFilter('전체')}>전체</button>
                <button type="button" className={`search-status-btn ${searchClassFilter === '같은반' ? 'active' : ''}`} onClick={() => setSearchClassFilter('같은반')}>같은 반 친구</button>
              </div>
              <div className="search-status-buttons" style={{ marginTop: '8px' }}>
                <button type="button" className={`search-status-btn ${searchOnlineStatus === '전체' ? 'active' : ''}`} onClick={() => setSearchOnlineStatus('전체')}>전체</button>
                <button type="button" className={`search-status-btn ${searchOnlineStatus === '접속중' ? 'active' : ''}`} onClick={() => setSearchOnlineStatus('접속중')}>접속중</button>
                <button type="button" className={`search-status-btn ${searchOnlineStatus === '비접속중' ? 'active' : ''}`} onClick={() => setSearchOnlineStatus('비접속중')}>비접속중</button>
              </div>
            </div>

            <div className="search-buttons">
              <button onClick={handleSearch} className="search-btn search-btn-primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                검색하기
              </button>
              <button onClick={handleReset} className="search-btn search-btn-secondary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                초기화
              </button>
            </div>
          </div>

          {loading && <div className="search-loading">검색 중...</div>}

          {!loading && searched && (
            <div className="search-results">
              <div className="search-results-header">
                <h3>검색 결과</h3>
                <span className="search-results-count">{
                  results.filter((classmate) => {
                    const isOnline = classmate.online || classmates.some(c => c.userId === classmate.userId);
                    const isSameClass = searchClassFilter === '같은반'
                      ? userSchools.some(s =>
                          s.schoolCode === classmate.school.schoolCode &&
                          s.graduationYear === Number(classmate.school.graduationYear) &&
                          s.grade === Number(classmate.school.grade) &&
                          s.classNumber === Number(classmate.school.classNumber)
                        )
                      : true;
                    if (!isSameClass) return false;
                    if (searchOnlineStatus === '접속중' && !isOnline) return false;
                    if (searchOnlineStatus === '비접속중' && isOnline) return false;
                    return true;
                  }).length
                }명</span>
              </div>

              {results.length === 0 ? (
                <div className="search-no-results">
                  <p>😢 검색 결과가 없습니다</p>
                  <p className="search-no-results-sub">다른 검색 조건으로 시도해보세요</p>
                </div>
              ) : (
                <div className="search-results-grid">
                  {results.filter((classmate) => {
                    const isOnline = classmate.online || classmates.some(c => c.userId === classmate.userId);
                    const isSameClass = searchClassFilter === '같은반'
                      ? userSchools.some(s =>
                          s.schoolCode === classmate.school.schoolCode &&
                          s.graduationYear === Number(classmate.school.graduationYear) &&
                          s.grade === Number(classmate.school.grade) &&
                          s.classNumber === Number(classmate.school.classNumber)
                        )
                      : true;
                    if (!isSameClass) return false;
                    if (searchOnlineStatus === '접속중' && !isOnline) return false;
                    if (searchOnlineStatus === '비접속중' && isOnline) return false;
                    return true;
                  }).map((classmate) => {
                    const isOnline = classmate.online || classmates.some(c => c.userId === classmate.userId);
                    return (
                    <div
                      key={classmate.id}
                      className="search-result-card"
                      onClick={() => handleProfileClick(classmate.userId)}
                    >
                      <div className="search-result-avatar-wrap">
                        <div className="search-result-avatar" style={{ background: isOnline ? '#f59e0b' : '#e8e3dc', color: isOnline ? 'white' : '#8b7d6b' }}>
                          {classmate.profileImageUrl ? (
                            <img src={classmate.profileImageUrl} alt={classmate.name} />
                          ) : (
                            <span>{classmate.name[0]}</span>
                          )}
                        </div>
                        {isOnline && <span className="search-online-dot"></span>}
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-name-row">
                          <h4 className="search-result-name">{classmate.name}</h4>
                          {friendStatuses[classmate.userId]?.status === 'FRIEND' && (
                            <span className="search-friend-badge">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                              친구
                            </span>
                          )}
                          {friendStatuses[classmate.userId]?.status === 'SENT' && (
                            <span className="search-friend-badge search-badge-sent">요청됨</span>
                          )}
                          {friendStatuses[classmate.userId]?.status === 'RECEIVED' && (
                            <span className="search-friend-badge search-badge-received">수락 대기</span>
                          )}
                        </div>
                        <p className="search-result-school">
                          {classmate.school.schoolName} {classmate.school.graduationYear}
                        </p>
                        {classmate.school.grade && classmate.school.classNumber && (
                          <p className="search-result-class">
                            {classmate.school.grade}학년 {classmate.school.classNumber}반
                          </p>
                        )}
                        {!isOnline && classmate.lastActiveTime && (
                          <p className="search-result-lastactive">
                            {formatRelativeTime(classmate.lastActiveTime)} 접속
                          </p>
                        )}
                        {isOnline && (
                          <p className="search-result-online-label">접속중</p>
                        )}
                        {classmate.bio && (
                          <p className="search-result-bio">{classmate.bio}</p>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
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
          onFriendStatusChange={(userId, status) => {
            setFriendStatuses(prev => ({ ...prev, [userId]: status }));
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
};

export default Search;
