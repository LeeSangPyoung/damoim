import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageAPI, MessageResponse } from '../api/message';
import { getAuthData } from '../utils/auth';
import './Messages.css';

type TabType = 'received' | 'sent';

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ userId: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { user: userData } = getAuthData();
    if (userData) {
      setUser(userData);
      loadMessages(userData.userId);
    }
  }, [activeTab]);

  const loadMessages = async (userId?: string) => {
    const targetUserId = userId || user?.userId;
    if (!targetUserId) return;

    setLoading(true);
    try {
      const data = activeTab === 'received'
        ? await messageAPI.getReceivedMessages(targetUserId)
        : await messageAPI.getSentMessages(targetUserId);
      setMessages(data);
    } catch (error) {
      console.error('메시지 로딩 실패:', error);
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
    <div className="messages-notion">
      {/* 헤더 */}
      <header className="messages-header">
        <div className="messages-header-main">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← 돌아가기
          </button>
          <h1 className="messages-title">메시지</h1>
          <div className="placeholder"></div>
        </div>
      </header>

      {/* 메인 */}
      <main className="messages-content">
        {/* 탭 */}
        <div className="messages-tabs">
          <button
            className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            받은 메시지
          </button>
          <button
            className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            본 메시지
          </button>
        </div>

        {/* 메시지 리스트 */}
        {loading ? (
          <div className="messages-loading">불러오는 중...</div>
        ) : messages.length === 0 ? (
          <div className="messages-empty">
            <p>{activeTab === 'received' ? '받은 메시지가 없습니다' : '병 메시지가 없습니다'}</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <div key={message.id} className={`message-item ${!message.read && activeTab === 'received' ? 'unread' : ''}`}>
                <div className="message-main">
                  <p className="message-content">{message.content}</p>
                  <div className="message-meta">
                    <span className="message-from">
                      {activeTab === 'received' ? `From: ${message.sender?.name}` : `To: ${message.receiver?.name}`}
                    </span>
                    <span className="message-date">{formatDate(message.sentAt)}</span>
                  </div>
                </div>
                {!message.read && activeTab === 'received' && (
                  <span className="unread-dot"></span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
