import './PostDetailModal.css';
import { PostResponse } from '../api/post';

interface PostDetailModalProps {
  post: PostResponse;
  onClose: () => void;
}

const PostDetailModal = ({ post, onClose }: PostDetailModalProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="post-detail-meta">
            <span className="post-author">{post.author?.name || '익명'}</span>
            <span className="post-date">{formatDate(post.createdAt)}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="post-detail-content">{post.content}</div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;
