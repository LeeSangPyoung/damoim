import { useState, useEffect } from 'react';
import { adminAPI, UserManagement, AdminStats } from '../api/admin';
import { getAuthData } from '../utils/auth';
import './Admin.css';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'posts'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { user } = getAuthData();

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadStats = async () => {
    if (!user) return;
    try {
      const data = await adminAPI.getStats(user.userId);
      setStats(data);
    } catch (error) {
      console.error('통계 로딩 실패:', error);
    }
  };

  const loadUsers = async () => {
    if (!user) return;
    try {
      setLoading(true);
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
    try {
      setLoading(true);
      const data = await adminAPI.searchUsers(user.userId, searchKeyword);
      setUsers(data);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId: string) => {
    if (!user || !window.confirm(`${userId}를 정지하시겠습니까?`)) return;
    try {
      await adminAPI.suspendUser(userId, user.userId);
      setModal({ type: 'success', message: '사용자가 정지되었습니다.' });
      loadUsers();
    } catch (error: any) {
      setModal({ type: 'error', message: error.response?.data?.error || '정지 실패' });
    }
  };

  const handleUnsuspend = async (userId: string) => {
    if (!user || !window.confirm(`${userId}의 정지를 해제하시겠습니까?`)) return;
    try {
      await adminAPI.unsuspendUser(userId, user.userId);
      setModal({ type: 'success', message: '정지가 해제되었습니다.' });
      loadUsers();
    } catch (error: any) {
      setModal({ type: 'error', message: error.response?.data?.error || '정지 해제 실패' });
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!user || !window.confirm(`${userId}의 역할을 ${newRole}로 변경하시겠습니까?`)) return;
    try {
      await adminAPI.changeUserRole(userId, newRole, user.userId);
      setModal({ type: 'success', message: '역할이 변경되었습니다.' });
      loadUsers();
    } catch (error: any) {
      setModal({ type: 'error', message: error.response?.data?.error || '역할 변경 실패' });
    }
  };

  if (!user) return null;

  return (
    <>
      {modal && (
        <div className="admin-modal-backdrop" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className={`admin-modal-icon ${modal.type}`}>
              {modal.type === 'success' ? '✓' : '!'}
            </div>
            <p>{modal.message}</p>
            <button onClick={() => setModal(null)}>확인</button>
          </div>
        </div>
      )}

      <div className="admin-container">
        <div className="admin-header">
          <h1>🛡️ 관리자 패널</h1>
          <p>사용자 관리, 콘텐츠 관리, 통계 확인</p>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 통계
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 사용자 관리
          </button>
          <button
            className={`admin-tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            📝 게시글 관리
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'stats' && stats && (
            <div className="admin-stats">
              <div className="stat-card">
                <div className="stat-icon">👤</div>
                <div className="stat-info">
                  <h3>전체 사용자</h3>
                  <p className="stat-value">{stats.totalUsers.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>활성 사용자</h3>
                  <p className="stat-value">{stats.activeUsers.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⛔</div>
                <div className="stat-info">
                  <h3>정지된 사용자</h3>
                  <p className="stat-value">{stats.suspendedUsers.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📄</div>
                <div className="stat-info">
                  <h3>전체 게시글</h3>
                  <p className="stat-value">{stats.totalPosts.toLocaleString()}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💬</div>
                <div className="stat-info">
                  <h3>전체 댓글</h3>
                  <p className="stat-value">{stats.totalComments.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="admin-users">
              <div className="admin-search">
                <input
                  type="text"
                  placeholder="사용자 ID, 이름, 이메일로 검색..."
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch}>검색</button>
              </div>

              {loading ? (
                <div className="admin-loading">로딩 중...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>사용자 ID</th>
                      <th>이름</th>
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
                        <td>{u.id}</td>
                        <td>{u.userId}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.role.toLowerCase()}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${u.status.toLowerCase()}`}>
                            {u.status}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>{u.lastLoginTime ? new Date(u.lastLoginTime).toLocaleString() : '-'}</td>
                        <td className="admin-actions">
                          {u.status === 'ACTIVE' ? (
                            <button
                              className="btn-suspend"
                              onClick={() => handleSuspend(u.userId)}
                            >
                              정지
                            </button>
                          ) : (
                            <button
                              className="btn-unsuspend"
                              onClick={() => handleUnsuspend(u.userId)}
                            >
                              해제
                            </button>
                          )}
                          {u.role === 'USER' && (
                            <button
                              className="btn-promote"
                              onClick={() => handleChangeRole(u.userId, 'ADMIN')}
                            >
                              관리자로
                            </button>
                          )}
                          {u.role === 'ADMIN' && u.userId !== user.userId && (
                            <button
                              className="btn-demote"
                              onClick={() => handleChangeRole(u.userId, 'USER')}
                            >
                              일반으로
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="admin-posts">
              <p className="coming-soon">게시글 관리 기능은 준비 중입니다.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
