import { useState, useEffect } from 'react';
import './Dashboard.css';
import { getAuthData } from '../utils/auth';
import { userAPI, ProfileResponse } from '../api/user';
import { postAPI, PostResponse } from '../api/post';
import ProfileModal from './ProfileModal';
import ComposeMessageModal from './ComposeMessageModal';
import CreatePostModal from './CreatePostModal';
import PostDetailModal from './PostDetailModal';

const LAST_SEEN_KEY = 'lastSeenPostId';

const getLastSeen = (): { all: number; myGrade: number; myClass: number } => {
  try {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { all: 0, myGrade: 0, myClass: 0 };
};

const saveLastSeen = (tab: string, maxPostId: number) => {
  const current = getLastSeen();
  current[tab as keyof typeof current] = Math.max(current[tab as keyof typeof current], maxPostId);
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(current));
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'myGrade' | 'myClass'>('all');
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<ProfileResponse | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostResponse | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState<{ id: string; name: string } | null>(null);
  const [newCounts, setNewCounts] = useState<{ all: number; myGrade: number; myClass: number }>({ all: 0, myGrade: 0, myClass: 0 });

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  useEffect(() => {
    loadNewCounts();
  }, []);

  const loadNewCounts = async () => {
    const { user } = getAuthData();
    if (!user) return;
    try {
      const lastSeen = getLastSeen();
      const counts = await postAPI.getNewPostCounts(user.userId, lastSeen.all, lastSeen.myGrade, lastSeen.myClass);
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
      const data = await postAPI.getPosts(user.userId, activeTab);
      setPosts(data);
      // 현재 탭의 최신 글 ID를 저장하여 읽음 처리
      if (data.length > 0) {
        const maxId = Math.max(...data.map(p => p.id));
        saveLastSeen(activeTab, maxId);
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
          onClick={() => setActiveTab('all')}
        >
          우리 학교
          {newCounts.all > 0 && activeTab !== 'all' && (
            <span className="dash-tab-badge">{newCounts.all}</span>
          )}
        </button>
        <button
          className={`dash-tab ${activeTab === 'myGrade' ? 'active' : ''}`}
          onClick={() => setActiveTab('myGrade')}
        >
          우리 학년
          {newCounts.myGrade > 0 && activeTab !== 'myGrade' && (
            <span className="dash-tab-badge">{newCounts.myGrade}</span>
          )}
        </button>
        <button
          className={`dash-tab ${activeTab === 'myClass' ? 'active' : ''}`}
          onClick={() => setActiveTab('myClass')}
        >
          우리 반
          {newCounts.myClass > 0 && activeTab !== 'myClass' && (
            <span className="dash-tab-badge">{newCounts.myClass}</span>
          )}
        </button>
      </div>

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

      {/* 모달 임시 비활성화 - props mismatch
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPosted={() => {
            setShowCreateModal(false);
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
            setSelectedPost(null);
            loadPosts();
          }}
        />
      )}
      */}
    </>
  );
};

export default Dashboard;
