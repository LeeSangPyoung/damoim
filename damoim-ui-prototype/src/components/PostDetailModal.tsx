import { useState, useEffect, useRef } from 'react';
import { postAPI, PostResponse, CommentResponse, UserSearchResult } from '../api/post';
import { getAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';
import './PostDetailModal.css';

interface PostDetailModalProps {
  post: PostResponse;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function PostDetailModal({ post: initialPost, onClose, onUpdate, onDelete }: PostDetailModalProps) {
  const [post, setPost] = useState<PostResponse>(initialPost);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 팝업 모달
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string } | null>(null);

  // 대댓글 기능
  const [replyingTo, setReplyingTo] = useState<CommentResponse | null>(null);

  // @멘션 자동완성
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<UserSearchResult[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @멘션 선택된 사용자 추적 (name → userId)
  const [selectedMentions, setSelectedMentions] = useState<Map<string, string>>(new Map());

  // 게시글 수정 모드
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');
  const [savingPost, setSavingPost] = useState(false);

  // 댓글 수정 모드
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const { user } = getAuthData();

  useEffect(() => {
    loadComments();
  }, [post.id]);

  // @멘션 검색
  useEffect(() => {
    if (mentionQuery.length > 0) {
      searchUsers(mentionQuery);
    } else {
      setMentionSuggestions([]);
      setShowMentionSuggestions(false);
    }
  }, [mentionQuery]);

  const searchUsers = async (query: string) => {
    try {
      const results = await postAPI.searchUsers(query);
      setMentionSuggestions(results);
      setShowMentionSuggestions(results.length > 0);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const loadComments = async () => {
    try {
      const data = await postAPI.getComments(post.id, user?.userId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user) return;

    try {
      await postAPI.toggleLike(post.id, user.userId);
      setPost({
        ...post,
        liked: !post.liked,
        likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // ===== 게시글 수정 =====
  const handleStartEditPost = () => {
    setEditPostContent(post.content);
    setIsEditingPost(true);
  };

  const handleCancelEditPost = () => {
    setIsEditingPost(false);
    setEditPostContent('');
  };

  const handleSaveEditPost = async () => {
    if (!user || !editPostContent.trim()) return;

    try {
      setSavingPost(true);
      const updatedPost = await postAPI.updatePost(post.id, user.userId, {
        content: editPostContent,
        imageUrls: post.imageUrls,
      });
      setPost(updatedPost);
      setIsEditingPost(false);
      onUpdate();
      setModal({ type: 'success', message: '게시글이 수정되었습니다.', onConfirm: () => setModal(null) });
    } catch (error) {
      console.error('Failed to update post:', error);
      setModal({ type: 'error', message: '게시글 수정에 실패했습니다.', onConfirm: () => setModal(null) });
    } finally {
      setSavingPost(false);
    }
  };

  // ===== 댓글 수정 =====
  const handleStartEditComment = (comment: CommentResponse) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentContent('');
  };

  const handleSaveEditComment = async () => {
    if (!user || !editCommentContent.trim() || editingCommentId === null) return;

    try {
      setSavingComment(true);
      await postAPI.updateComment(editingCommentId, user.userId, editCommentContent);
      await loadComments();
      setEditingCommentId(null);
      setEditCommentContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
      setModal({ type: 'error', message: '댓글 수정에 실패했습니다.', onConfirm: () => setModal(null) });
    } finally {
      setSavingComment(false);
    }
  };

  // ===== @멘션 (닉네임 기반) =====
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCommentContent(value);
    setCursorPosition(cursorPos);

    // @멘션 감지
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setMentionQuery(textAfterAt);
        return;
      }
    }

    setMentionQuery('');
    setShowMentionSuggestions(false);
  };

  const handleMentionSelect = (selectedUser: UserSearchResult) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = commentContent.substring(0, cursorPosition);
    const textAfterCursor = commentContent.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // 닉네임으로 삽입
      const newText =
        commentContent.substring(0, lastAtIndex) +
        `@${selectedUser.name} ` +
        textAfterCursor;
      setCommentContent(newText);
      setShowMentionSuggestions(false);
      setMentionQuery('');

      // 선택된 멘션 추적 (name → userId)
      setSelectedMentions(prev => {
        const next = new Map(prev);
        next.set(selectedUser.name, selectedUser.userId);
        return next;
      });

      // 커서 위치 조정
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + selectedUser.name.length + 2; // @ + name + space
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const extractMentionedUserIds = (content: string): string[] => {
    // @닉네임 패턴에서 추적된 멘션 맵을 이용해 userId 추출
    const userIds: string[] = [];
    selectedMentions.forEach((userId, name) => {
      if (content.includes(`@${name}`)) {
        userIds.push(userId);
      }
    });
    return userIds;
  };

  const handleAddComment = async () => {
    if (!user || !commentContent.trim()) return;

    try {
      setCommenting(true);

      const mentionedUserIds = extractMentionedUserIds(commentContent);

      await postAPI.addComment(post.id, user.userId, {
        content: commentContent,
        parentCommentId: replyingTo?.id,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      });

      await loadComments();

      setPost({ ...post, commentCount: post.commentCount + 1 });
      setCommentContent('');
      setReplyingTo(null);
      setSelectedMentions(new Map());
      onUpdate();
    } catch (error) {
      console.error('Failed to add comment:', error);
      setModal({ type: 'error', message: '댓글 작성에 실패했습니다.', onConfirm: () => setModal(null) });
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (!user) return;
    setModal({
      type: 'confirm',
      message: '댓글을 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        setModal(null);
        try {
          await postAPI.deleteComment(commentId, user.userId);
          await loadComments();
          onUpdate();
          setModal({ type: 'success', message: '댓글이 삭제되었습니다.', onConfirm: () => setModal(null) });
        } catch (error) {
          console.error('Failed to delete comment:', error);
          setModal({ type: 'error', message: '댓글 삭제에 실패했습니다.', onConfirm: () => setModal(null) });
        }
      },
      onCancel: () => setModal(null),
    });
  };

  const handleReply = (comment: CommentResponse) => {
    setReplyingTo(comment);
    // 닉네임으로 멘션 삽입
    setCommentContent(`@${comment.author.name} `);
    // 멘션 추적에 추가
    setSelectedMentions(prev => {
      const next = new Map(prev);
      next.set(comment.author.name, comment.author.userId);
      return next;
    });
    textareaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentContent('');
    setSelectedMentions(new Map());
  };

  const handleDelete = () => {
    if (!user) return;
    setModal({
      type: 'confirm',
      message: '게시글을 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        setModal(null);
        try {
          await postAPI.deletePost(post.id, user.userId);
          setModal({
            type: 'success',
            message: '게시글이 삭제되었습니다.',
            onConfirm: () => {
              setModal(null);
              onDelete();
            },
          });
        } catch (error) {
          console.error('Failed to delete post:', error);
          setModal({ type: 'error', message: '게시글 삭제에 실패했습니다.', onConfirm: () => setModal(null) });
        }
      },
      onCancel: () => setModal(null),
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderComment = (comment: CommentResponse, depth: number = 0) => {
    const isReply = depth > 0;
    const isEditing = editingCommentId === comment.id;

    return (
      <div key={comment.id}>
        <div className={`post-detail-comment ${isReply ? 'post-detail-comment--reply' : ''}`}>
          {isReply && <span className="post-detail-reply-arrow">↳</span>}
          <div className="post-detail-comment-avatar" style={isReply ? { width: 30, height: 30, fontSize: 12 } : undefined}>
            {comment.author.profileImageUrl ? (
              <img src={comment.author.profileImageUrl} alt={comment.author.name} />
            ) : (
              <span>{comment.author.name[0]}</span>
            )}
          </div>
          <div className="post-detail-comment-body">
            <div className="post-detail-comment-header">
              <span className="post-detail-comment-author">{comment.author.name}</span>
              <span className="post-detail-comment-date">
                {formatDate(comment.createdAt)}
                {comment.updatedAt && <span className="post-detail-edited-tag"> (수정됨)</span>}
              </span>
            </div>

            {isEditing ? (
              <div className="post-detail-comment-edit-area">
                <textarea
                  value={editCommentContent}
                  onChange={(e) => setEditCommentContent(e.target.value)}
                  rows={2}
                  disabled={savingComment}
                />
                <div className="post-detail-comment-edit-actions">
                  <button
                    className="post-detail-edit-save-btn"
                    onClick={handleSaveEditComment}
                    disabled={savingComment || !editCommentContent.trim()}
                  >
                    {savingComment ? '저장 중...' : '저장'}
                  </button>
                  <button className="post-detail-edit-cancel-btn" onClick={handleCancelEditComment}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="post-detail-comment-content">{renderContentWithMentions(comment.content)}</div>
                <div className="post-detail-comment-actions">
                  <button className="post-detail-comment-reply" onClick={() => handleReply(comment)}>
                    답글
                  </button>
                  {comment.canEdit && (
                    <button className="post-detail-comment-edit" onClick={() => handleStartEditComment(comment)}>
                      수정
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {!isEditing && comment.canDelete && (
            <button
              className="post-detail-comment-delete"
              onClick={() => handleDeleteComment(comment.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
        </div>

        {/* 대댓글 렌더링 (재귀) */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="post-detail-comment-replies">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderContentWithMentions = (content: string) => {
    // @닉네임 패턴을 하이라이트 (공백 전까지의 단어)
    const parts = content.split(/(@\S+)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            return (
              <span key={index} className="post-detail-mention">
                {part}
              </span>
            );
          }
          return part;
        })}
      </>
    );
  };

  const isAuthor = user && post.author.userId === user.userId;

  return (
    <>
    {modal && (
      <ConfirmationModal
        type={modal.type}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        confirmText={modal.confirmText}
      />
    )}
    <div className="post-detail-backdrop" onClick={onClose}>
      <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="post-detail-header">
          <h2>게시글 상세</h2>
          <button className="post-detail-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg></button>
        </div>

        <div className="post-detail-body">
          {/* Author Info */}
          <div className="post-detail-author">
            <div className="post-detail-avatar">
              {post.author.profileImageUrl ? (
                <img src={post.author.profileImageUrl} alt={post.author.name} />
              ) : (
                <span>{post.author.name[0]}</span>
              )}
            </div>
            <div className="post-detail-author-info">
              <div className="post-detail-author-name">{post.author.name}</div>
              <div className="post-detail-author-school">
                {post.author.schoolName} {post.author.graduationYear}
              </div>
              <div className="post-detail-date">{formatDate(post.createdAt)}</div>
            </div>
            {isAuthor && (
              <div className="post-detail-author-actions">
                {!isEditingPost && (
                  <button className="post-detail-edit-btn" onClick={handleStartEditPost}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> 수정
                  </button>
                )}
                <button className="post-detail-delete-btn" onClick={handleDelete}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> 삭제
                </button>
              </div>
            )}
          </div>

          {/* Content - 수정 모드 / 일반 모드 */}
          {isEditingPost ? (
            <div className="post-detail-edit-area">
              <textarea
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                rows={5}
                disabled={savingPost}
                className="post-detail-edit-textarea"
              />
              <div className="post-detail-edit-actions">
                <button
                  className="post-detail-edit-save-btn"
                  onClick={handleSaveEditPost}
                  disabled={savingPost || !editPostContent.trim()}
                >
                  {savingPost ? '저장 중...' : '저장'}
                </button>
                <button className="post-detail-edit-cancel-btn" onClick={handleCancelEditPost}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="post-detail-content">{post.content}</div>
          )}

          {/* Images */}
          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="post-detail-images">
              <div className="post-detail-image-main">
                <img src={post.imageUrls[currentImageIndex]} alt={`Image ${currentImageIndex + 1}`} />
                {post.imageUrls.length > 1 && (
                  <>
                    <button
                      className="post-detail-image-prev"
                      onClick={() => setCurrentImageIndex((currentImageIndex - 1 + post.imageUrls!.length) % post.imageUrls!.length)}
                    >
                      ‹
                    </button>
                    <button
                      className="post-detail-image-next"
                      onClick={() => setCurrentImageIndex((currentImageIndex + 1) % post.imageUrls!.length)}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
              {post.imageUrls.length > 1 && (
                <div className="post-detail-image-thumbnails">
                  {post.imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className={`post-detail-image-thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img src={url} alt={`Thumbnail ${index + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats & Actions */}
          <div className="post-detail-stats">
            <button className={`post-detail-like-btn ${post.liked ? 'liked' : ''}`} onClick={handleLike}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {post.likeCount}
            </button>
            <span className="post-detail-stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {post.commentCount}
            </span>
            <span className="post-detail-stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {post.viewCount}
            </span>
          </div>

          {/* Comments */}
          <div className="post-detail-comments">
            <h3>댓글 ({comments.length})</h3>

            {comments.length === 0 ? (
              <div className="post-detail-no-comments">
                첫 댓글을 남겨보세요
              </div>
            ) : (
              <div className="post-detail-comments-list">
                {comments.map(comment => renderComment(comment))}
              </div>
            )}

            {/* Add Comment */}
            <div className="post-detail-comment-input">
              {replyingTo && (
                <div className="post-detail-reply-info">
                  <span>@{replyingTo.author.name}님에게 답글 작성 중</span>
                  <button onClick={cancelReply}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg></button>
                </div>
              )}

              <div className="post-detail-textarea-container">
                <textarea
                  ref={textareaRef}
                  placeholder="댓글을 입력하세요... (@로 사용자 멘션)"
                  value={commentContent}
                  onChange={handleCommentChange}
                  rows={3}
                  disabled={commenting}
                />

                {/* @멘션 자동완성 드롭다운 */}
                {showMentionSuggestions && (
                  <div className="post-detail-mention-suggestions">
                    {mentionSuggestions.map(user => (
                      <div
                        key={user.userId}
                        className="post-detail-mention-suggestion-item"
                        onClick={() => handleMentionSelect(user)}
                      >
                        <div className="post-detail-mention-suggestion-avatar">
                          {user.profileImageUrl ? (
                            <img src={user.profileImageUrl} alt={user.name} />
                          ) : (
                            <span>{user.name[0]}</span>
                          )}
                        </div>
                        <div className="post-detail-mention-suggestion-info">
                          <div className="post-detail-mention-suggestion-name">{user.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="post-detail-comment-submit"
                onClick={handleAddComment}
                disabled={commenting || !commentContent.trim()}
              >
                {commenting ? '작성 중...' : '댓글 작성'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
