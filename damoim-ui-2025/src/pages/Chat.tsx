import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';
import { chatAPI, ChatRoomResponse, ChatMessageResponse } from '../api/chat';
import { getAuthData } from '../utils/auth';
import ConfirmationModal from '../components/ConfirmationModal';

type ChatTab = 'dm' | 'group';

export default function Chat() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ChatTab>('dm');
  const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ messageId: number; content: string } | null>(null);

  useEffect(() => {
    loadRooms();
  }, [activeTab]);

  const loadRooms = async () => {
    const { user } = getAuthData();
    if (!user) return;

    setLoading(true);
    try {
      const data = activeTab === 'dm'
        ? await chatAPI.getMyChatRooms(user.userId)
        : []; // 그룹 채팅은 나중에
      setRooms(data);
    } catch (error) {
      console.error('채팅방 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (room: ChatRoomResponse) => {
    const { user } = getAuthData();
    if (!user) return;

    try {
      const data = await chatAPI.getMessages(room.id, user.userId);
      setMessages(data);
      setSelectedRoom(room);
    } catch (error) {
      console.error('메시지 로딩 실패:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteMessage = async () => {
    if (!deleteModal) return;

    const { user } = getAuthData();
    if (!user) return;

    try {
      await chatAPI.deleteMessage(deleteModal.messageId, user.userId);
      // 메시지 목록에서 제거
      setMessages(messages.filter(msg => msg.id !== deleteModal.messageId));
      setDeleteModal(null);
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      alert('메시지 삭제에 실패했습니다.');
      setDeleteModal(null);
    }
  };

  // 채팅방 상세보기
  if (selectedRoom) {
    return (
      <>
        {deleteModal && (
          <ConfirmationModal
            type="confirm"
            message={`"${deleteModal.content.length > 20 ? deleteModal.content.substring(0, 20) + '...' : deleteModal.content}" 메시지를 삭제하시겠습니까?`}
            onConfirm={handleDeleteMessage}
            onCancel={() => setDeleteModal(null)}
          />
        )}

        <div className="chat-notion">
          {/* 헤더 */}
          <header className="chat-header">
            <div className="chat-header-main">
              <button className="back-btn" onClick={() => setSelectedRoom(null)}>
                ← 목록
              </button>
              <h1 className="chat-title">{selectedRoom.otherUser?.name}</h1>
              <div className="placeholder"></div>
            </div>
          </header>

          {/* 메시지 영역 */}
          <main className="chat-messages">
            <div className="messages-list">
              {messages.length === 0 ? (
                <div className="messages-empty">메시지가 없습니다</div>
              ) : (
                messages.map((msg) => {
                  const { user } = getAuthData();
                  const isMe = msg.senderUserId === user?.userId;
                  const canDelete = isMe && !msg.isRead; // 내가 보낸 메시지이고 상대방이 읽지 않음

                  return (
                    <div key={msg.id} className={`message-item ${isMe ? 'me' : 'other'}`}>
                      <div className="message-bubble">
                        <p className="message-content">{msg.content}</p>
                        <div className="message-footer">
                          <span className="message-time">{formatDate(msg.sentAt)}</span>
                          {canDelete && (
                            <button
                              className="delete-message-btn"
                              onClick={() => setDeleteModal({ messageId: msg.id, content: msg.content })}
                              title="메시지 삭제"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>

          {/* 입력창 */}
          <footer className="chat-input">
            <input type="text" placeholder="메시지를 입력하세요..." disabled />
            <button disabled>전송</button>
          </footer>
        </div>
      </>
    );
  }

  // 채팅방 목록
  return (
    <div className="chat-notion">
      {/* 헤더 */}
      <header className="chat-header">
        <div className="chat-header-main">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← 돌아가기
          </button>
          <h1 className="chat-title">채팅</h1>
          <div className="placeholder"></div>
        </div>
      </header>

      {/* 메인 */}
      <main className="chat-content">
        {/* 탭 */}
        <div className="chat-tabs">
          <button
            className={`tab-btn ${activeTab === 'dm' ? 'active' : ''}`}
            onClick={() => setActiveTab('dm')}
          >
            1:1 채팅
          </button>
          <button
            className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            그룹 채팅
          </button>
        </div>

        {/* 채팅방 리스트 */}
        {loading ? (
          <div className="chat-loading">불러오는 중...</div>
        ) : rooms.length === 0 ? (
          <div className="chat-empty">
            <p>{activeTab === 'dm' ? '1:1 채팅방이 없습니다' : '그룹 채팅방이 없습니다'}</p>
          </div>
        ) : (
          <div className="chat-list">
            {rooms.map((room) => (
              <div 
                key={room.id} 
                className="chat-item"
                onClick={() => loadMessages(room)}
              >
                <div className="chat-info">
                  <h3>{room.otherUser?.name}</h3>
                  <p>{room.lastMessage || '메시지가 없습니다'}</p>
                </div>
                <div className="chat-meta">
                  {room.lastMessageAt && (
                    <span className="chat-time">{formatDate(room.lastMessageAt)}</span>
                  )}
                  {room.unreadCount > 0 && (
                    <span className="unread-badge">{room.unreadCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
