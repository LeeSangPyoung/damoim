import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Board.css';
import { getAuthData } from '../utils/auth';
import { postAPI, PostResponse } from '../api/post';
import CreatePostModal from './CreatePostModal';
import PostDetailModal from './PostDetailModal';

const Board = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolName = searchParams.get('school') || '';
  const graduationYear = searchParams.get('year') || '';

  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!schoolName || !graduationYear) {
      navigate('/dashboard');
      return;
    }
    loadPosts();
  }, [schoolName, graduationYear]);

  const loadPosts = async () => {
    const { user } = getAuthData();
    if (!user) {
      console.log('로그인 안 됨');
      return;
    }

    setLoading(true);
    console.log('게시글 로딩 시작:', schoolName, graduationYear);
    try {
      const data = await postAPI.getPosts(user.userId, 'all', encodeURIComponent(schoolName), encodeURIComponent(graduationYear));
      console.log('게시글 로딩 성공:', data);
      setPosts(data);
    } catch (error) {
      console.error('게시글 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="board-notion">
      {/* 헤더 */}
      <header className="board-header">
        <div className="board-header-main">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← 돌아가기
          </button>
          <div className="board-title">
            <h1>{schoolName}</h1>
            <span className="board-year">{graduationYear}</span>
          </div>
          <button className="write-btn" onClick={() => setShowCreateModal(true)}>
            + 글쓰기
          </button>
        </div>
      </header>

      {/* 게시글 리스트 */}
      <main className="board-content">
        {loading ? (
          <div className="board-loading">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="board-empty">
            <p>아직 게시글이 없습니다</p>
            <button onClick={() => setShowCreateModal(true)}>첫 게시글 작성하기</button>
          </div>
        ) : (
          <div className="post-list">
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-item"
                onClick={() => setSelectedPost(post)}
              >
                <div className="post-main">
                  <p className="post-preview">{post.content.substring(0, 100)}{post.content.length > 100 ? '...' : ''}</p>
                </div>
                <div className="post-meta">
                  <span className="post-author">{post.author?.name || '익명'}</span>
                  <span className="post-date">{formatDate(post.createdAt)}</span>
                  <span className="post-arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 모달 */}
      {showCreateModal && (
        <CreatePostModal
          schoolName={schoolName}
          graduationYear={graduationYear}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadPosts();
          }}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
};

export default Board;
