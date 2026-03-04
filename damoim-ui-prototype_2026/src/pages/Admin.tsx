import { useState, useEffect } from 'react';
import { adminAPI, UserManagement, AdminStats, AdminPost, AdminComment, AdminShop, AdminReunion, AnnouncementItem } from '../api/admin';
import { getAuthData } from '../utils/auth';
import './Admin.css';

type AdminMenu = 'stats' | 'users' | 'posts' | 'comments' | 'shops' | 'reunions' | 'announcements';

const MENU_ITEMS: { key: AdminMenu; label: string }[] = [
  { key: 'stats', label: '통계' },
  { key: 'users', label: '사용자 관리' },
  { key: 'posts', label: '게시글 관리' },
  { key: 'comments', label: '댓글 관리' },
  { key: 'shops', label: '동창가게 관리' },
  { key: 'reunions', label: '찐모임 관리' },
  { key: 'announcements', label: '공지사항' },
];

export default function Admin() {
  const [activeMenu, setActiveMenu] = useState<AdminMenu>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [reunions, setReunions] = useState<AdminReunion[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  // 공지사항 작성/수정
  const [announcementForm, setAnnouncementForm] = useState<{ id?: number; title: string; content: string } | null>(null);

  const { user } = getAuthData();

  useEffect(() => {
    setSearchKeyword('');
    loadData(activeMenu);
  }, [activeMenu]);

  const loadData = (menu: AdminMenu, keyword?: string) => {
    if (!user) return;
    setLoading(true);
    const done = () => setLoading(false);
    switch (menu) {
      case 'stats': adminAPI.getStats(user.userId).then(setStats).catch(console.error).finally(done); break;
      case 'users': (keyword ? adminAPI.searchUsers(user.userId, keyword) : adminAPI.getAllUsers(user.userId)).then(setUsers).catch(console.error).finally(done); break;
      case 'posts': adminAPI.getAllPosts(user.userId, keyword).then(setPosts).catch(console.error).finally(done); break;
      case 'comments': adminAPI.getAllComments(user.userId, keyword).then(setComments).catch(console.error).finally(done); break;
      case 'shops': adminAPI.getAllShops(user.userId, keyword).then(setShops).catch(console.error).finally(done); break;
      case 'reunions': adminAPI.getAllReunions(user.userId, keyword).then(setReunions).catch(console.error).finally(done); break;
      case 'announcements': adminAPI.getAllAnnouncements(user.userId).then(setAnnouncements).catch(console.error).finally(done); break;
    }
  };

  const handleSearch = () => loadData(activeMenu, searchKeyword);
  const handleReset = () => { setSearchKeyword(''); loadData(activeMenu); };

  const confirm = (message: string, onConfirm: () => Promise<void>) => {
    setConfirmModal({
      message,
      onConfirm: async () => {
        await onConfirm();
        setConfirmModal(null);
      }
    });
  };

  const success = (msg: string) => setModal({ type: 'success', message: msg });
  const fail = (error: any, fallback: string) => setModal({ type: 'error', message: error?.response?.data?.error || fallback });

  // 사용자
  const handleSuspend = (uid: string, name: string) => confirm(`${name}(@${uid}) 계정을 정지하시겠습니까?`, async () => {
    try { await adminAPI.suspendUser(uid, user!.userId); success(`${name} 계정을 정지했습니다.`); loadData('users', searchKeyword || undefined); } catch (e) { fail(e, '정지 실패'); }
  });
  const handleUnsuspend = async (uid: string, name: string) => {
    try { await adminAPI.unsuspendUser(uid, user!.userId); success(`${name} 정지를 해제했습니다.`); loadData('users', searchKeyword || undefined); } catch (e) { fail(e, '해제 실패'); }
  };
  const handleChangeRole = async (uid: string, name: string, role: string) => {
    try { await adminAPI.changeUserRole(uid, role, user!.userId); success(`${name} 역할을 변경했습니다.`); loadData('users', searchKeyword || undefined); } catch (e) { fail(e, '변경 실패'); }
  };

  // 삭제 핸들러들
  const handleDeletePost = (id: number, name: string) => confirm(`${name}의 게시글(#${id})을 삭제하시겠습니까?`, async () => {
    try { await adminAPI.deletePost(id, user!.userId); success('게시글이 삭제되었습니다.'); loadData('posts', searchKeyword || undefined); } catch (e) { fail(e, '삭제 실패'); }
  });
  const handleDeleteComment = (id: number, name: string) => confirm(`${name}의 댓글(#${id})을 삭제하시겠습니까?`, async () => {
    try { await adminAPI.deleteComment(id, user!.userId); success('댓글이 삭제되었습니다.'); loadData('comments', searchKeyword || undefined); } catch (e) { fail(e, '삭제 실패'); }
  });
  const handleDeleteShop = (id: number, name: string) => confirm(`"${name}" 가게를 삭제하시겠습니까?`, async () => {
    try { await adminAPI.deleteShop(id, user!.userId); success('가게가 삭제되었습니다.'); loadData('shops', searchKeyword || undefined); } catch (e) { fail(e, '삭제 실패'); }
  });
  const handleDeleteReunion = (id: number, name: string) => confirm(`"${name}" 모임을 삭제하시겠습니까?\n모임 내 모든 데이터가 삭제됩니다.`, async () => {
    try { await adminAPI.deleteReunion(id, user!.userId); success('모임이 삭제되었습니다.'); loadData('reunions', searchKeyword || undefined); } catch (e) { fail(e, '삭제 실패'); }
  });
  const handleDeleteAnnouncement = (id: number) => confirm('이 공지사항을 삭제하시겠습니까?', async () => {
    try { await adminAPI.deleteAnnouncement(id, user!.userId); success('공지사항이 삭제되었습니다.'); loadData('announcements'); } catch (e) { fail(e, '삭제 실패'); }
  });
  const handleToggleAnnouncement = async (item: AnnouncementItem) => {
    try { await adminAPI.updateAnnouncement(user!.userId, item.id, { active: !item.active }); loadData('announcements'); } catch (e) { fail(e, '변경 실패'); }
  };
  const handleSaveAnnouncement = async () => {
    if (!announcementForm || !announcementForm.title.trim() || !announcementForm.content.trim()) return;
    try {
      if (announcementForm.id) {
        await adminAPI.updateAnnouncement(user!.userId, announcementForm.id, { title: announcementForm.title, content: announcementForm.content });
        success('공지사항이 수정되었습니다.');
      } else {
        await adminAPI.createAnnouncement(user!.userId, announcementForm.title, announcementForm.content);
        success('공지사항이 등록되었습니다.');
      }
      setAnnouncementForm(null);
      loadData('announcements');
    } catch (e) { fail(e, '저장 실패'); }
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const formatDateTime = (s: string) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (!user) return null;

  // 검색바 렌더 헬퍼
  const renderSearchBar = (placeholder: string) => (
    <div className="adm-search-bar">
      <input type="text" className="adm-search-input" placeholder={placeholder}
        value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSearch()} />
      <button className="adm-search-btn" onClick={handleSearch}>검색</button>
      <button className="adm-reset-btn" onClick={handleReset}>초기화</button>
    </div>
  );

  return (
    <>
      {modal && (
        <div className="adm-overlay" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className={`adm-modal-icon ${modal.type}`}>{modal.type === 'success' ? '✓' : '✕'}</div>
            <p>{modal.message}</p>
            <button className="adm-modal-btn" onClick={() => setModal(null)}>확인</button>
          </div>
        </div>
      )}
      {confirmModal && (
        <div className="adm-overlay" onClick={() => setConfirmModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-icon confirm">!</div>
            <p style={{ whiteSpace: 'pre-line' }}>{confirmModal.message}</p>
            <div className="adm-modal-actions">
              <button className="adm-modal-btn-cancel" onClick={() => setConfirmModal(null)}>취소</button>
              <button className="adm-modal-btn-confirm" onClick={confirmModal.onConfirm}>확인</button>
            </div>
          </div>
        </div>
      )}
      {/* 공지사항 작성/수정 모달 */}
      {announcementForm && (
        <div className="adm-overlay" onClick={() => setAnnouncementForm(null)}>
          <div className="adm-form-modal" onClick={e => e.stopPropagation()}>
            <h3>{announcementForm.id ? '공지사항 수정' : '공지사항 작성'}</h3>
            <input type="text" className="adm-form-input" placeholder="제목"
              value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} />
            <textarea className="adm-form-textarea" placeholder="내용" rows={5}
              value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })} />
            <div className="adm-form-actions">
              <button className="adm-reset-btn" onClick={() => setAnnouncementForm(null)}>취소</button>
              <button className="adm-search-btn" onClick={handleSaveAnnouncement}
                disabled={!announcementForm.title.trim() || !announcementForm.content.trim()}>저장</button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-container">
        <div className="adm-header">
          <h2>관리자</h2>
          <span className="adm-who">관리자: <strong>{user.name}</strong></span>
        </div>

        <div className="adm-layout">
          <aside className="adm-sidebar">
            {MENU_ITEMS.map(item => (
              <button key={item.key}
                className={`adm-sidebar-item ${activeMenu === item.key ? 'active' : ''}`}
                onClick={() => setActiveMenu(item.key)}>
                {item.label}
              </button>
            ))}
          </aside>

          <main className="adm-main">
            {/* ===== 통계 ===== */}
            {activeMenu === 'stats' && (<>
              <div className="adm-section-title">통계</div>
              {loading ? <div className="adm-loading">통계 불러오는 중...</div> : stats ? (
                <div className="adm-stats-grid">
                  <div className="adm-stat-card"><div className="adm-stat-dot"></div><div className="adm-stat-num">{stats.onlineUsers.toLocaleString()}</div><div className="adm-stat-label">현재 접속자</div></div>
                  <div className="adm-stat-card"><div className="adm-stat-num">{stats.todayUsers.toLocaleString()}</div><div className="adm-stat-label">오늘 접속자</div></div>
                  <div className="adm-stat-card"><div className="adm-stat-num">{stats.totalUsers.toLocaleString()}</div><div className="adm-stat-label">전체 사용자</div></div>
                  <div className="adm-stat-card"><div className="adm-stat-num">{stats.activeUsers.toLocaleString()}</div><div className="adm-stat-label">활성 사용자</div></div>
                  <div className="adm-stat-card"><div className="adm-stat-num">{stats.suspendedUsers.toLocaleString()}</div><div className="adm-stat-label">정지된 사용자</div></div>
                  <div className="adm-stat-card"><div className="adm-stat-num">{stats.totalPosts.toLocaleString()}</div><div className="adm-stat-label">전체 게시글</div></div>
                  <div className="adm-stat-card"><div className="adm-stat-num">{stats.totalComments.toLocaleString()}</div><div className="adm-stat-label">전체 댓글</div></div>
                </div>
              ) : <div className="adm-empty">통계를 불러올 수 없습니다.</div>}
            </>)}

            {/* ===== 사용자 관리 ===== */}
            {activeMenu === 'users' && (<>
              <div className="adm-section-title">사용자 관리</div>
              {renderSearchBar('아이디, 이름, 이메일 검색...')}
              {loading ? <div className="adm-loading">불러오는 중...</div> : (
                <div className="adm-list">
                  {users.map(u => (
                    <div className="adm-card" key={u.id}>
                      <div className="adm-card-left">
                        <div className="adm-avatar">{u.name[0]}</div>
                        <div className="adm-card-info">
                          <div className="adm-card-name">{u.name} <span className="adm-card-id">@{u.userId}</span></div>
                          <div className="adm-card-sub">{u.email}</div>
                        </div>
                      </div>
                      <div className="adm-card-right">
                        <div className="adm-card-badges">
                          <span className={`adm-badge-pill ${u.role === 'ADMIN' ? 'admin' : 'user'}`}>{u.role === 'ADMIN' ? '관리자' : '일반'}</span>
                          <span className={`adm-badge-pill ${u.status === 'ACTIVE' ? 'active' : 'suspended'}`}>{u.status === 'ACTIVE' ? '활성' : '정지'}</span>
                        </div>
                        <div className="adm-card-meta">가입 {formatDate(u.createdAt)} · 로그인 {u.lastLoginTime ? formatDate(u.lastLoginTime) : '-'}</div>
                        <div className="adm-card-actions">
                          {u.status === 'ACTIVE' ? <button className="adm-btn adm-btn-danger" onClick={() => handleSuspend(u.userId, u.name)}>정지</button>
                            : <button className="adm-btn adm-btn-success" onClick={() => handleUnsuspend(u.userId, u.name)}>해제</button>}
                          {u.role === 'USER' && <button className="adm-btn adm-btn-promote" onClick={() => handleChangeRole(u.userId, u.name, 'ADMIN')}>관리자 승격</button>}
                          {u.role === 'ADMIN' && u.userId !== user.userId && <button className="adm-btn adm-btn-demote" onClick={() => handleChangeRole(u.userId, u.name, 'USER')}>일반 전환</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="adm-count">총 {users.length}명</div>
                </div>
              )}
            </>)}

            {/* ===== 게시글 관리 ===== */}
            {activeMenu === 'posts' && (<>
              <div className="adm-section-title">게시글 관리</div>
              {renderSearchBar('내용, 작성자 이름/아이디 검색...')}
              {loading ? <div className="adm-loading">불러오는 중...</div> : posts.length === 0 ? <div className="adm-empty">게시글이 없습니다.</div> : (
                <div className="adm-list">
                  {posts.map(p => (
                    <div className="adm-card" key={p.id}>
                      <div className="adm-card-left" style={{ flex: 1 }}>
                        <div className="adm-avatar">{p.authorName[0]}</div>
                        <div className="adm-card-info" style={{ flex: 1 }}>
                          <div className="adm-card-name">{p.authorName} <span className="adm-card-id">@{p.authorUserId}</span></div>
                          <div className="adm-post-content">{p.content}</div>
                          <div className="adm-post-meta">
                            <span>{p.schoolName} {p.graduationYear}</span><span>·</span><span>{formatDateTime(p.createdAt)}</span>
                            {p.imageCount > 0 && <><span>·</span><span>사진 {p.imageCount}</span></>}
                            <span>·</span><span>좋아요 {p.likeCount} · 댓글 {p.commentCount} · 조회 {p.viewCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="adm-card-right" style={{ minWidth: 'auto' }}>
                        <button className="adm-btn adm-btn-danger" onClick={() => handleDeletePost(p.id, p.authorName)}>삭제</button>
                      </div>
                    </div>
                  ))}
                  <div className="adm-count">총 {posts.length}개</div>
                </div>
              )}
            </>)}

            {/* ===== 댓글 관리 ===== */}
            {activeMenu === 'comments' && (<>
              <div className="adm-section-title">댓글 관리</div>
              {renderSearchBar('내용, 작성자 이름/아이디 검색...')}
              {loading ? <div className="adm-loading">불러오는 중...</div> : comments.length === 0 ? <div className="adm-empty">댓글이 없습니다.</div> : (
                <div className="adm-list">
                  {comments.map(c => (
                    <div className="adm-card" key={c.id}>
                      <div className="adm-card-left" style={{ flex: 1 }}>
                        <div className="adm-avatar">{c.authorName[0]}</div>
                        <div className="adm-card-info" style={{ flex: 1 }}>
                          <div className="adm-card-name">{c.authorName} <span className="adm-card-id">@{c.authorUserId}</span>{c.isReply && <span className="adm-reply-badge">답글</span>}</div>
                          <div className="adm-comment-content">{c.content}</div>
                          <div className="adm-comment-meta">
                            <span className="adm-comment-post-ref">게시글: {c.postContentPreview}</span><span>·</span><span>{formatDateTime(c.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="adm-card-right" style={{ minWidth: 'auto' }}>
                        <button className="adm-btn adm-btn-danger" onClick={() => handleDeleteComment(c.id, c.authorName)}>삭제</button>
                      </div>
                    </div>
                  ))}
                  <div className="adm-count">총 {comments.length}개</div>
                </div>
              )}
            </>)}

            {/* ===== 동창가게 관리 ===== */}
            {activeMenu === 'shops' && (<>
              <div className="adm-section-title">동창가게 관리</div>
              {renderSearchBar('가게명, 사장님 이름/아이디, 주소 검색...')}
              {loading ? <div className="adm-loading">불러오는 중...</div> : shops.length === 0 ? <div className="adm-empty">등록된 가게가 없습니다.</div> : (
                <div className="adm-list">
                  {shops.map(s => (
                    <div className="adm-card" key={s.id}>
                      <div className="adm-card-left" style={{ flex: 1 }}>
                        <div className="adm-avatar">{s.shopName[0]}</div>
                        <div className="adm-card-info" style={{ flex: 1 }}>
                          <div className="adm-card-name">{s.shopName}</div>
                          <div className="adm-card-sub">{s.category}{s.subCategory ? ` > ${s.subCategory}` : ''} · {s.ownerName}(@{s.ownerUserId})</div>
                          <div className="adm-post-meta">
                            <span>{s.address}</span>
                            {s.phone && <><span>·</span><span>{s.phone}</span></>}
                            <span>·</span><span>리뷰 {s.reviewCount}개{s.avgRating ? ` · 평점 ${s.avgRating.toFixed(1)}` : ''}</span>
                            <span>·</span><span>{formatDate(s.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="adm-card-right" style={{ minWidth: 'auto' }}>
                        <button className="adm-btn adm-btn-danger" onClick={() => handleDeleteShop(s.id, s.shopName)}>삭제</button>
                      </div>
                    </div>
                  ))}
                  <div className="adm-count">총 {shops.length}개</div>
                </div>
              )}
            </>)}

            {/* ===== 찐모임 관리 ===== */}
            {activeMenu === 'reunions' && (<>
              <div className="adm-section-title">찐모임 관리</div>
              {renderSearchBar('모임명, 학교명, 생성자 검색...')}
              {loading ? <div className="adm-loading">불러오는 중...</div> : reunions.length === 0 ? <div className="adm-empty">모임이 없습니다.</div> : (
                <div className="adm-list">
                  {reunions.map(r => (
                    <div className="adm-card" key={r.id}>
                      <div className="adm-card-left" style={{ flex: 1 }}>
                        <div className="adm-avatar">{r.name[0]}</div>
                        <div className="adm-card-info" style={{ flex: 1 }}>
                          <div className="adm-card-name">{r.name}</div>
                          <div className="adm-card-sub">{r.schoolName} {r.graduationYear} · {r.createdByName}(@{r.createdByUserId})</div>
                          <div className="adm-post-meta">
                            <span>멤버 {r.memberCount}명</span>
                            <span>·</span><span>초대코드: {r.inviteCode}</span>
                            <span>·</span><span>{formatDate(r.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="adm-card-right" style={{ minWidth: 'auto' }}>
                        <button className="adm-btn adm-btn-danger" onClick={() => handleDeleteReunion(r.id, r.name)}>삭제</button>
                      </div>
                    </div>
                  ))}
                  <div className="adm-count">총 {reunions.length}개</div>
                </div>
              )}
            </>)}

            {/* ===== 공지사항 관리 ===== */}
            {activeMenu === 'announcements' && (<>
              <div className="adm-section-header">
                <div className="adm-section-title">공지사항</div>
                <button className="adm-search-btn" onClick={() => setAnnouncementForm({ title: '', content: '' })}>새 공지 작성</button>
              </div>
              {loading ? <div className="adm-loading">불러오는 중...</div> : announcements.length === 0 ? <div className="adm-empty">공지사항이 없습니다.</div> : (
                <div className="adm-list">
                  {announcements.map(a => (
                    <div className="adm-card" key={a.id}>
                      <div className="adm-card-left" style={{ flex: 1 }}>
                        <div className="adm-card-info" style={{ flex: 1 }}>
                          <div className="adm-card-name">
                            {a.title}
                            <span className={`adm-badge-pill ${a.active ? 'active' : 'suspended'}`} style={{ marginLeft: 8 }}>
                              {a.active ? '게시중' : '비활성'}
                            </span>
                          </div>
                          <div className="adm-post-content">{a.content}</div>
                          <div className="adm-post-meta">
                            <span>{a.createdByName}</span><span>·</span><span>{formatDateTime(a.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="adm-card-right" style={{ minWidth: 'auto' }}>
                        <button className="adm-btn adm-btn-promote" onClick={() => handleToggleAnnouncement(a)}>
                          {a.active ? '비활성' : '활성화'}
                        </button>
                        <button className="adm-btn adm-btn-demote" onClick={() => setAnnouncementForm({ id: a.id, title: a.title, content: a.content })}>수정</button>
                        <button className="adm-btn adm-btn-danger" onClick={() => handleDeleteAnnouncement(a.id)}>삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>)}
          </main>
        </div>
      </div>
    </>
  );
}
