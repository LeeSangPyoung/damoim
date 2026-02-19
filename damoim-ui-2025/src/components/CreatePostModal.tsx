import { useState } from 'react';
import './CreatePostModal.css';
import { postAPI } from '../api/post';
import { getAuthData } from '../utils/auth';

interface CreatePostModalProps {
  schoolName: string;
  graduationYear: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CreatePostModal = ({ schoolName, graduationYear, onClose, onSuccess }: CreatePostModalProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const { user } = getAuthData();
    if (!user) return;

    setLoading(true);
    try {
      await postAPI.createPost(user.userId, {
        content: content.trim(),
        schoolName,
        graduationYear,
      });
      onSuccess();
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      alert('게시글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>새 게시글</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={8}
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '작성 중...' : '작성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
