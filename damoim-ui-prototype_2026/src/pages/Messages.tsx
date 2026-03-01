import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageAPI, MessageResponse } from '../api/message';
import { getAuthData } from '../utils/auth';
import ComposeMessageModal from '../components/ComposeMessageModal';
import ConfirmationModal from '../components/ConfirmationModal';
import './Messages.css';

type TabType = 'received' | 'sent';

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ userId: string; name: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedMessages, setReceivedMessages] = useState<MessageResponse[]>([]);
  const [sentMessages, setSentMessages] = useState<MessageResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ userId: string; name: string } | null>(null);
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string } | null>(null);

  useEffect(() => {
    const { user: userData } = getAuthData();
    if (userData) {
      setUser(userData);
      loadMessages(userData.userId);
      loadUnreadCount(userData.userId);
    }
  }, []);

  // 다른 곳(사이드바 등)에서 쪽지 전송 시 목록 새로고침
  useEffect(() => {
    const handleMessageSent = () => {
      loadMessages();
      loadUnreadCount();
    };
    window.addEventListener('messageSent', handleMessageSent);
    return () => window.removeEventListener('messageSent', handleMessageSent);
  }, [user]);

  const loadMessages = async (userId?: string) => {
    const targetUserId = userId || user?.userId;
    if (!targetUserId) return;

    setLoading(true);
    try {
      const [received, sent] = await Promise.all([
        messageAPI.getReceivedMessages(targetUserId),
        messageAPI.getSentMessages(targetUserId),
      ]);
      setReceivedMessages(received);
      setSentMessages(sent);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async (userId?: string) => {
    const targetUserId = userId || user?.userId;
    if (!targetUserId) return;

    try {
      const count = await messageAPI.getUnreadCount(targetUserId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleMessageClick = async (message: MessageResponse) => {
    if (!user) return;

    if (expandedMessageId === message.id) {
      setExpandedMessageId(null);
      return;
    }

    setExpandedMessageId(message.id);

    // Mark as read if it's a received message and not yet read
    if (activeTab === 'received' && !message.read) {
      try {
        await messageAPI.markAsRead(message.id, user.userId);
        // Update local state
        setReceivedMessages(prev =>
          prev.map(msg =>
            msg.id === message.id
              ? { ...msg, read: true, readAt: new Date().toISOString() }
              : msg
          )
        );
        loadUnreadCount();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleDeleteMessage = async (messageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setModal({
      type: 'confirm',
      message: '정말 이 쪽지를 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        setModal(null);
        try {
          await messageAPI.deleteMessage(messageId, user.userId);

          if (activeTab === 'received') {
            setReceivedMessages(prev => prev.filter(msg => msg.id !== messageId));
          } else {
            setSentMessages(prev => prev.filter(msg => msg.id !== messageId));
          }

          if (expandedMessageId === messageId) {
            setExpandedMessageId(null);
          }

          loadUnreadCount();
          setModal({ type: 'success', message: '쪽지가 삭제되었습니다.', onConfirm: () => setModal(null) });
        } catch (error) {
          console.error('Failed to delete message:', error);
          setModal({ type: 'error', message: '쪽지 삭제에 실패했습니다.', onConfirm: () => setModal(null) });
        }
      },
      onCancel: () => setModal(null),
    });
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

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await messageAPI.markAllAsRead(user.userId);
      setReceivedMessages(prev => prev.map(msg => ({ ...msg, read: true, readAt: msg.readAt || new Date().toISOString() })));
      setUnreadCount(0);
      setModal({ type: 'success', message: '모든 쪽지를 읽음 처리했습니다.', onConfirm: () => setModal(null) });
    } catch (error) {
      console.error('일괄 읽음 처리 실패:', error);
      setModal({ type: 'error', message: '읽음 처리에 실패했습니다.', onConfirm: () => setModal(null) });
    }
  };

  const currentMessages = activeTab === 'received' ? receivedMessages : sentMessages;

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
    <div className="messages-main">
      <div className="messages-header">
        <h1>쪽지함</h1>
        <div className="messages-header-btns">
          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              모두 읽음
            </button>
          )}
          <button className="compose-btn" onClick={() => setShowComposeModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            새 쪽지
          </button>
        </div>
      </div>

      <div className="messages-tabs">
        <button
          className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          받은 쪽지
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          보낸 쪽지
        </button>
      </div>

      <div className="messages-content">
        {loading ? (
          <div className="messages-loading">로딩 중...</div>
        ) : currentMessages.length === 0 ? (
          <div className="messages-empty">
            {activeTab === 'received' ? '받은 쪽지가 없습니다.' : '보낸 쪽지가 없습니다.'}
          </div>
        ) : (
          <div className="messages-list">
            {currentMessages.map((message) => {
              const isExpanded = expandedMessageId === message.id;
              const otherUser = activeTab === 'received' ? message.sender : message.receiver;
              const isUnread = activeTab === 'received' && !message.read;

              return (
                <div
                  key={message.id}
                  className={`message-item ${isUnread ? 'unread' : ''} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="message-header">
                    <div className="message-user">
                      <div
                        className="message-avatar"
                        style={{
                          backgroundImage: otherUser.profileImageUrl
                            ? `url(${otherUser.profileImageUrl})`
                            : undefined,
                        }}
                      >
                        {!otherUser.profileImageUrl && otherUser.name.charAt(0)}
                      </div>
                      <div className="message-user-info">
                        <span className="message-name">
                          {otherUser.name}
                          {isUnread && <span className="new-badge">N</span>}
                        </span>
                        <span className="message-id">@{otherUser.userId}</span>
                      </div>
                    </div>
                    <div className="message-meta">
                      <span className="message-time">{formatDate(message.sentAt)}</span>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDeleteMessage(message.id, e)}
                        title="삭제"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="message-preview">
                    {isExpanded ? message.content : message.content.slice(0, 100) + (message.content.length > 100 ? '...' : '')}
                  </div>

                  {isExpanded && activeTab === 'received' && (
                    <div className="message-actions">
                      <button
                        className="reply-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTarget({ userId: message.sender.userId, name: message.sender.name });
                        }}
                      >
                        회신
                      </button>
                    </div>
                  )}

                  {message.readAt && activeTab === 'sent' && (
                    <div className="message-read-status">
                      읽음 · {formatDate(message.readAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showComposeModal && (
        <ComposeMessageModal
          onClose={() => setShowComposeModal(false)}
          onSent={() => {
            loadMessages();
            loadUnreadCount();
          }}
        />
      )}

      {replyTarget && (
        <ComposeMessageModal
          recipientId={replyTarget.userId}
          recipientName={replyTarget.name}
          onClose={() => {
            setReplyTarget(null);
            loadMessages();
            loadUnreadCount();
          }}
          onSent={() => {
            loadMessages();
            loadUnreadCount();
          }}
        />
      )}
    </div>
    </>
  );
}
