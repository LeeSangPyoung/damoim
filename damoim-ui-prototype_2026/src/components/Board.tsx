import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { getAuthData } from '../utils/auth';
import { userAPI, ProfileResponse, SchoolInfo } from '../api/user';
import { postAPI, PostResponse } from '../api/post';
import ProfileModal from './ProfileModal';
import ComposeMessageModal from './ComposeMessageModal';
import CreatePostModal from './CreatePostModal';
import PostDetailModal from './PostDetailModal';


const getLastSeenKey = (schoolName: string, graduationYear: string) =>
  `lastSeenPostId_${schoolName}_${graduationYear}`;

const getLastSeen = (schoolName: string, graduationYear: string): { all: number; myGrade: number; myClass: number } => {
  try {
    const stored = localStorage.getItem(getLastSeenKey(schoolName, graduationYear));
    if (stored) return JSON.parse(stored);
  } catch {}
  return { all: 0, myGrade: 0, myClass: 0 };
};

const saveLastSeen = (schoolName: string, graduationYear: string, tab: string, maxPostId: number) => {
  const current = getLastSeen(schoolName, graduationYear);
  current[tab as keyof typeof current] = Math.max(current[tab as keyof typeof current], maxPostId);
  localStorage.setItem(getLastSeenKey(schoolName, graduationYear), JSON.stringify(current));
};

const Board = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolName = searchParams.get('school') || '';
  const graduationYear = searchParams.get('year') || '';

  const [activeTab, setActiveTab] = useState<'all' | 'myGrade' | 'myClass'>(
    (searchParams.get('tab') as 'all' | 'myGrade' | 'myClass') || 'all'
  );

  // 탭 변경 시 URL 파라미터도 업데이트
  const handleTabChange = (tab: 'all' | 'myGrade' | 'myClass') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<ProfileResponse | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostResponse | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<{ id: string; name: string } | null>(null);
  const [newCounts, setNewCounts] = useState<{ all: number; myGrade: number; myClass: number }>({ all: 0, myGrade: 0, myClass: 0 });

  // 우리 반 필터 (프로필에 등록된 학년/반만 표시)
  const [gradeClasses, setGradeClasses] = useState<{ grade: string; classNumber?: string }[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<{ grade: string; classNumber: string }[]>([]);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(true);

  // 프로필에서 해당 학교의 학년/반 데이터 로드
  useEffect(() => {
    const loadGradeClasses = async () => {
      const { user } = getAuthData();
      if (!user || !schoolName) return;
      try {
        const profile = await userAPI.getProfile(user.userId);
        const matching = profile.schools.filter(
          (s: SchoolInfo) => s.schoolName === schoolName && s.graduationYear === graduationYear
        );
        const gc = matching
          .filter((s: SchoolInfo) => s.grade)
          .map((s: SchoolInfo) => ({ grade: s.grade!, classNumber: s.classNumber }));
        setGradeClasses(gc);
      } catch {
        setGradeClasses([]);
      }
    };
    loadGradeClasses();
  }, [schoolName, graduationYear]);

  useEffect(() => {
    if (!schoolName || !graduationYear) {
      navigate('/dashboard');
      return;
    }
    loadPosts();
  }, [activeTab, schoolName, graduationYear, selectedClasses, isAllSelected]);

  useEffect(() => {
    if (schoolName && graduationYear) {
      loadNewCounts();
    }
  }, [schoolName, graduationYear]);

  const loadNewCounts = async () => {
    const { user } = getAuthData();
    if (!user) return;
    try {
      const lastSeen = getLastSeen(schoolName, graduationYear);
      const counts = await postAPI.getNewPostCounts(user.userId, lastSeen.all, lastSeen.myGrade, lastSeen.myClass, schoolName, graduationYear);
      setNewCounts(counts);
    } catch (error) {
      console.error('Failed to load new counts:', error);
    }
  };

  const loadPosts = async () => {
    const { user } = getAuthData();
    if (!user) return;

    setLoading(true);
    try {
      // 전체 선택이거나 멀티셀렉트일 경우 필터 없이 가져와서 프론트엔드에서 필터링
      const shouldFilterFrontend = activeTab === 'myClass' && !isAllSelected && selectedClasses.length > 0;
      const data = await postAPI.getPosts(user.userId, activeTab, schoolName, graduationYear);

      let filteredData = data;
      if (shouldFilterFrontend) {
        // 선택된 학년/반에 해당하는 게시글만 필터링
        filteredData = data.filter(post =>
          selectedClasses.some(sc =>
            post.targetGrade === sc.grade && post.targetClassNumber === sc.classNumber
          )
        );
      }

      setPosts(filteredData);
      if (filteredData.length > 0) {
        const maxId = Math.max(...filteredData.map(p => p.id));
        saveLastSeen(schoolName, graduationYear, activeTab, maxId);
        setNewCounts(prev => ({ ...prev, [activeTab]: 0 }));
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
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

  const handlePostClick = (post: PostResponse) => {
    setSelectedPost(post);
  };

  const handleLike = async (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const { user } = getAuthData();
    if (!user) return;

    try {
      await postAPI.toggleLike(postId, user.userId);
      loadPosts();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR');
  };

  return (
    <>
      <div className="dash-header-actions">
        <button className="dash-back-to-schools" onClick={() => navigate('/dashboard')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          학교 목록으로
        </button>
        <button className="dash-write-btn" onClick={() => setShowCreateModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          글쓰기
        </button>
      </div>

      <div className="dash-tabs">
        <button
          className={`dash-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          우리 학교
          {newCounts.all > 0 && activeTab !== 'all' && (
            <span className="dash-tab-badge">{newCounts.all}</span>
          )}
        </button>
        <button
          className={`dash-tab ${activeTab === 'myGrade' ? 'active' : ''}`}
          onClick={() => handleTabChange('myGrade')}
        >
          우리 학년
          {newCounts.myGrade > 0 && activeTab !== 'myGrade' && (
            <span className="dash-tab-badge">{newCounts.myGrade}</span>
          )}
        </button>
        <button
          className={`dash-tab ${activeTab === 'myClass' ? 'active' : ''}`}
          onClick={() => handleTabChange('myClass')}
        >
          우리 반
          {newCounts.myClass > 0 && activeTab !== 'myClass' && (
            <span className="dash-tab-badge">{newCounts.myClass}</span>
          )}
        </button>
      </div>

      {/* 우리 반 필터 칩 - 내 프로필에 등록된 학년/반만 표시 */}
      {activeTab === 'myClass' && gradeClasses.length > 0 && (
        <div className="board-filter-bar">
          <div className="board-filter-row">
            <div className="board-filter-chips">
              {/* 전체 버튼 */}
              <button
                className={`board-filter-chip ${isAllSelected ? 'active' : ''}`}
                onClick={() => {
                  setIsAllSelected(true);
                  setSelectedClasses([]);
                }}
              >
                전체
              </button>

              {/* 학년/반 버튼들 */}
              {gradeClasses.filter(gc => gc.classNumber).map((gc, i) => {
                const isActive = selectedClasses.some(sc => sc.grade === gc.grade && sc.classNumber === gc.classNumber);
                return (
                  <button
                    key={i}
                    className={`board-filter-chip ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (isAllSelected) {
                        // 전체에서 특정 반 선택
                        setIsAllSelected(false);
                        setSelectedClasses([{ grade: gc.grade, classNumber: gc.classNumber! }]);
                      } else {
                        if (isActive) {
                          // 이미 선택된 반 클릭 - 제거
                          const newSelected = selectedClasses.filter(sc => !(sc.grade === gc.grade && sc.classNumber === gc.classNumber));
                          if (newSelected.length === 0) {
                            // 마지막 선택 제거시 전체로
                            setIsAllSelected(true);
                          }
                          setSelectedClasses(newSelected);
                        } else {
                          // 새로운 반 추가
                          setSelectedClasses([...selectedClasses, { grade: gc.grade, classNumber: gc.classNumber! }]);
                        }
                      }
                    }}
                  >
                    {gc.grade}학년 {gc.classNumber}반
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="dash-posts">
        {loading ? (
          <div className="dash-loading">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="dash-empty">
            <p>게시글이 없습니다.</p>
            <button className="dash-write-btn-empty" onClick={() => setShowCreateModal(true)}>
              첫 게시글을 작성해보세요
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginLeft: '4px'}}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="dash-post" onClick={() => handlePostClick(post)}>
              <div className="dash-post-header">
                <div className="dash-post-author">
                  <div className="dash-avatar">
                    {post.author.profileImageUrl ? (
                      <img src={post.author.profileImageUrl} alt={post.author.name} />
                    ) : (
                      post.author.name[0]
                    )}
                  </div>
                  <div>
                    <div className="dash-author-name">{post.author.name}</div>
                    <div className="dash-post-meta">
                      <span className="dash-board-name">
                        {post.author.schoolName} {post.author.graduationYear}
                      </span>
                      <span> · {formatDate(post.createdAt)}</span>
                      {post.visibility === 'CLASS' && (
                        <span className="dash-visibility-badge dash-visibility-class">{post.targetGrade}학년 {post.targetClassNumber}반</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="dash-post-content">
                {post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}
              </div>

              {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="dash-post-thumbnail">
                  <img src={post.imageUrls[0]} alt="Post thumbnail" />
                  {post.imageUrls.length > 1 && (
                    <div className="dash-post-image-count">+{post.imageUrls.length - 1}</div>
                  )}
                </div>
              )}

              <div className="dash-post-stats">
                <button
                  className={`dash-like-btn ${post.liked ? 'liked' : ''}`}
                  onClick={(e) => handleLike(post.id, e)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {post.likeCount}
                </button>
                <span className="dash-stat-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {post.commentCount}
                </span>
                <span className="dash-stat-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {post.viewCount}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

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

      {showCreateModal && (
        <CreatePostModal
          schoolName={schoolName}
          graduationYear={graduationYear}
          activeTab={activeTab}
          onClose={() => setShowCreateModal(false)}
          onPosted={() => {
            loadPosts();
          }}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={loadPosts}
          onDelete={() => {
            loadPosts();
            setSelectedPost(null);
          }}
        />
      )}
    </>
  );
};

export default Board;
