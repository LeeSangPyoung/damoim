import { useState, useEffect } from 'react';
import { adminAPI, UserManagement, AdminStats } from '../api/admin';
import { getAuthData } from '../utils/auth';
import './Admin.css';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [modal, setModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { user } = getAuthData();

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    else if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  const loadStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const data = await adminAPI.getStats(user.userId);
      setStats(data);
    } catch (error) {
      console.error('통계 로딩 실패:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await adminAPI.getAllUsers(user.userId);
      setUsers(data);
    } catch (error) {
      console.error('사용자 목록 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await adminAPI.searchUsers(user.userId, searchKeyword);
      setUsers(data);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (targetUserId: string, name: string) => {
    if (!user) return;
    try {
      await adminAPI.suspendUser(targetUserId, user.userId);
      setModal({ type: 'success', message: `${name} 계정을 정지했습니다.` });
      loadUsers();
    } catch (error: any) {
      setModal({ type: 'error', message: error.response?.data?.error || '정지 실패' });
    }
  };

  const handleUnsuspend = async (targetUserId: string, name: string) => {
    if (!user) return;
    try {
      await adminAPI.unsuspendUser(targetUserId, user.userId);
      setModal({ type: 'success', message: `${name} 계정 정지를 해제했습니다.` });
      loadUsers();
    } catch (error: any) {
      setModal({ type: 'error', message: error.response?.data?.error || '정지 해제 실패' });
    }
  };

  const handleChangeRole = async (targetUserId: string, name: string, newRole: string) => {
    if (!user) return;
    try {
      await adminAPI.changeUserRole(targetUserId, newRole, user.userId);
      setModal({ type: 'success', message: `${name}의 역할을 ${newRole === 'ADMIN' ? '관리자' : '일반 사용자'}로 변경했습니다.` });
      loadUsers();
    } catch (error: any) {
      setModal({ type: 'error', message: error.response?.data?.error || '역할 변경 실패' });
    }
  };

  if (!user) return null;

  return (
    <>
      {modal && (
        <div className="adm-overlay" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className={`adm-modal-icon ${modal.type}`}>
              {modal.type === 'success' ? '✓' : '✕'}
            </div>
            <p>{modal.message}</p>
            <button className="adm-modal-btn" onClick={() => setModal(null)}>확인</button>
          </div>
        </div>
      )}

      <div className="adm-wrap">
        {/* 헤더 */}
        <div className="adm-header">
          <div className="adm-header-left">
            <span className="adm-badge">🛡️ ADMIN</span>
            <div>
              <h2 className="adm-title">관리자 패널</h2>
              <p className="adm-subtitle">사용자 관리 및 서비스 통계</p>
            </div>
          </div>
          <div className="adm-header-right">
            <span className="adm-who">관리자: <strong>{user.name}</strong></span>
          </div>
        </div>

        {/* 탭 */}
        <div className="adm-tabs">
          <button
            className={`adm-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 통계
          </button>
          <button
            className={`adm-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 사용자 관리
          </button>
        </div>

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div className="adm-content">
            {statsLoading ? (
              <div className="adm-loading">통계 불러오는 중...</div>
            ) : stats ? (
              <div className="adm-stats-grid">
                <div className="adm-stat-card adm-stat-teal">
                  <div className="adm-stat-dot adm-dot-pulse"></div>
                  <div className="adm-stat-num">{stats.onlineUsers.toLocaleString()}</div>
                  <div className="adm-stat-label">현재 접속자</div>
                </div>
                <div className="adm-stat-card adm-stat-cyan">
                  <div className="adm-stat-num">{stats.todayUsers.toLocaleString()}</div>
                  <div className="adm-stat-label">오늘 접속자</div>
                </div>
                <div className="adm-stat-card adm-stat-blue">
                  <div className="adm-stat-num">{stats.totalUsers.toLocaleString()}</div>
                  <div className="adm-stat-label">전체 사용자</div>
                </div>
                <div className="adm-stat-card adm-stat-green">
                  <div className="adm-stat-num">{stats.activeUsers.toLocaleString()}</div>
                  <div className="adm-stat-label">활성 사용자</div>
                </div>
                <div className="adm-stat-card adm-stat-red">
                  <div className="adm-stat-num">{stats.suspendedUsers.toLocaleString()}</div>
                  <div className="adm-stat-label">정지된 사용자</div>
                </div>
                <div className="adm-stat-card adm-stat-orange">
                  <div className="adm-stat-num">{stats.totalPosts.toLocaleString()}</div>
                  <div className="adm-stat-label">전체 게시글</div>
                </div>
                <div className="adm-stat-card adm-stat-purple">
                  <div className="adm-stat-num">{stats.totalComments.toLocaleString()}</div>
                  <div className="adm-stat-label">전체 댓글</div>
                </div>
              </div>
            ) : (
              <div className="adm-empty">통계를 불러올 수 없습니다.</div>
            )}
          </div>
        )}

        {/* 사용자 관리 탭 */}
        {activeTab === 'users' && (
          <div className="adm-content">
            <div className="adm-search-bar">
              <input
                type="text"
                className="adm-search-input"
                placeholder="아이디, 이름, 이메일 검색..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button className="adm-search-btn" onClick={handleSearch}>검색</button>
              <button className="adm-reset-btn" onClick={() => { setSearchKeyword(''); loadUsers(); }}>초기화</button>
            </div>

            {loading ? (
              <div className="adm-loading">사용자 목록 불러오는 중...</div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>사용자</th>
                      <th>이메일</th>
                      <th>역할</th>
                      <th>상태</th>
                      <th>가입일</th>
                      <th>마지막 로그인</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar">{u.name[0]}</div>
                            <div>
                              <div className="adm-user-name">{u.name}</div>
                              <div className="adm-user-id">@{u.userId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="adm-email">{u.email}</td>
                        <td>
                          <span className={`adm-role-badge ${u.role === 'ADMIN' ? 'admin' : 'user'}`}>
                            {u.role === 'ADMIN' ? '관리자' : '일반'}
                          </span>
                        </td>
                        <td>
                          <span className={`adm-status-badge ${u.status === 'ACTIVE' ? 'active' : 'suspended'}`}>
                            {u.status === 'ACTIVE' ? '활성' : '정지'}
                          </span>
                        </td>
                        <td className="adm-date">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                        <td className="adm-date">{u.lastLoginTime ? new Date(u.lastLoginTime).toLocaleDateString('ko-KR') : '-'}</td>
                        <td>
                          <div className="adm-action-btns">
                            {u.status === 'ACTIVE' ? (
                              <button className="adm-btn adm-btn-danger" onClick={() => handleSuspend(u.userId, u.name)}>정지</button>
                            ) : (
                              <button className="adm-btn adm-btn-success" onClick={() => handleUnsuspend(u.userId, u.name)}>해제</button>
                            )}
                            {u.role === 'USER' && (
                              <button className="adm-btn adm-btn-purple" onClick={() => handleChangeRole(u.userId, u.name, 'ADMIN')}>관리자↑</button>
                            )}
                            {u.role === 'ADMIN' && u.userId !== user.userId && (
                              <button className="adm-btn adm-btn-gray" onClick={() => handleChangeRole(u.userId, u.name, 'USER')}>일반↓</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="adm-count">총 {users.length}명</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
