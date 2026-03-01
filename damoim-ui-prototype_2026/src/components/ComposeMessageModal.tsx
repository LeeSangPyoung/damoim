import { useState, useEffect, useRef } from 'react';
import { messageAPI, MessageRequest } from '../api/message';
import { friendAPI, FriendResponse } from '../api/friend';
import { getAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';
import './ComposeMessageModal.css';

interface ComposeMessageModalProps {
  recipientId?: string;
  recipientName?: string;
  onClose: () => void;
  onSent?: () => void;
}

export default function ComposeMessageModal({
  recipientId: initialRecipientId,
  recipientName: initialRecipientName,
  onClose,
  onSent,
}: ComposeMessageModalProps) {
  const [recipientId, setRecipientId] = useState(initialRecipientId || '');
  const [recipientName, setRecipientName] = useState(initialRecipientName || '');
  const [searchQuery, setSearchQuery] = useState(initialRecipientName || '');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // 친구 검색
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<FriendResponse[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPreset = !!initialRecipientId;

  useEffect(() => {
    if (!isPreset) {
      loadFriends();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFriends = async () => {
    const { user } = getAuthData();
    if (!user) return;
    try {
      const data = await friendAPI.getMyFriends(user.userId);
      setFriends(data.filter(f => f.status === 'ACCEPTED'));
    } catch (err) {
      console.error('친구 목록 로딩 실패:', err);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setRecipientId('');
    setRecipientName('');

    if (value.trim().length >= 1) {
      const filtered = friends.filter(f =>
        f.name.toLowerCase().includes(value.toLowerCase()) ||
        f.userId.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredFriends(filtered);
    } else {
      setFilteredFriends(friends);
    }
    setShowDropdown(true);
  };

  const showAllFriends = () => {
    if (searchQuery.trim().length === 0) {
      setFilteredFriends(friends);
    }
    setShowDropdown(true);
  };

  const handleSelectFriend = (friend: FriendResponse) => {
    setRecipientId(friend.userId);
    setRecipientName(friend.name);
    setSearchQuery(friend.name);
    setShowDropdown(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { user } = getAuthData();
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!recipientId.trim()) {
      setError('받는 사람을 선택해주세요.');
      return;
    }

    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    if (recipientId === user.userId) {
      setError('자기 자신에게는 쪽지를 보낼 수 없습니다.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const request: MessageRequest = {
        receiverId: recipientId.trim(),
        content: content.trim(),
      };

      await messageAPI.sendMessage(user.userId, request);

      if (onSent) {
        onSent();
      }

      setShowConfirmation(true);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.response?.data || '쪽지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {showConfirmation && (
        <ConfirmationModal
          message="쪽지가 전송되었습니다!"
          onConfirm={onClose}
        />
      )}

      <div className="compose-modal-backdrop" onClick={handleBackdropClick}>
        <div className="compose-modal">
        <div className="compose-modal-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '8px'}}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            쪽지 쓰기
          </h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="compose-modal-form">
          <div className="form-group">
            <label htmlFor="recipientSearch">
              받는 사람 <span className="required">*</span>
            </label>
            {isPreset ? (
              <div className="recipient-selected">
                <span className="recipient-selected-name">{initialRecipientName || initialRecipientId}</span>
              </div>
            ) : (
              <div className="recipient-search-wrap" ref={dropdownRef}>
                <input
                  ref={inputRef}
                  id="recipientSearch"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => showAllFriends()}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && !showDropdown) {
                      e.preventDefault();
                      showAllFriends();
                    }
                  }}
                  placeholder="친구 이름을 입력하세요"
                  disabled={sending}
                  className="form-input"
                  autoComplete="off"
                />
                {recipientName && (
                  <span className="recipient-hint">@{recipientId}</span>
                )}
                {showDropdown && (
                  <div className="recipient-dropdown">
                    {filteredFriends.length > 0 ? (
                      filteredFriends.map(friend => (
                        <div
                          key={friend.userId}
                          className="recipient-dropdown-item"
                          onClick={() => handleSelectFriend(friend)}
                        >
                          <div className="recipient-dropdown-avatar">
                            {friend.profileImageUrl ? (
                              <img src={friend.profileImageUrl} alt={friend.name} />
                            ) : (
                              <span>{friend.name[0]}</span>
                            )}
                          </div>
                          <div className="recipient-dropdown-info">
                            <span className="recipient-dropdown-name">{friend.name}</span>
                            <span className="recipient-dropdown-id">@{friend.userId}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="recipient-dropdown-empty">
                        일치하는 친구가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="content">
              내용 <span className="required">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="메시지를 입력하세요 (최대 2000자)"
              maxLength={2000}
              rows={8}
              disabled={sending}
              className="form-textarea"
            />
            <div className="char-count">
              {content.length} / 2000
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="compose-modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="cancel-btn"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={sending || !recipientId}
              className="send-btn"
            >
              {sending ? '전송 중...' : '전송'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
