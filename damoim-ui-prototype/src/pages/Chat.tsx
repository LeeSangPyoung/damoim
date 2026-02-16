import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { chatAPI, ChatRoomResponse, ChatMessageResponse } from '../api/chat';
import { groupChatAPI, GroupChatRoomResponse, GroupChatMessageResponse } from '../api/groupChat';
import { userAPI, ClassmateInfo } from '../api/user';
import { getAuthData } from '../utils/auth';
import ConfirmationModal from '../components/ConfirmationModal';
import './Chat.css';

type ChatTab = 'dm' | 'group';

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ChatTab>('dm');

  // 1:1 채팅 상태
  const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);

  // 그룹 채팅 상태
  const [groupRooms, setGroupRooms] = useState<GroupChatRoomResponse[]>([]);
  const [selectedGroupRoom, setSelectedGroupRoom] = useState<GroupChatRoomResponse | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessageResponse[]>([]);

  // 공통 상태
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);

  // 그룹채팅 생성 모달
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [classmates, setClassmates] = useState<ClassmateInfo[]>([]);
  const [classmatesLoaded, setClassmatesLoaded] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // 확인 모달
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string } | null>(null);

  // 그룹채팅 초대 모달
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteClassmates, setInviteClassmates] = useState<ClassmateInfo[]>([]);
  const [selectedInviteMembers, setSelectedInviteMembers] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  // 멤버 관리 모달 (강퇴)
  const [showMemberModal, setShowMemberModal] = useState(false);

  const { user } = getAuthData();
  const roomIdParam = searchParams.get('roomId');

  // === 1:1 채팅 로직 ===
  const loadRoomsAndSelect = useCallback(async (targetRoomId?: number) => {
    if (!user) return;
    try {
      const data = await chatAPI.getMyChatRooms(user.userId);
      setRooms(data);
      if (targetRoomId) {
        const targetRoom = data.find(r => r.id === targetRoomId);
        if (targetRoom) {
          setSelectedRoom(targetRoom);
          const msgs = await chatAPI.getMessages(targetRoom.id, user.userId);
          setMessages(msgs);
        }
      }
    } catch (error) {
      console.error('채팅방 목록 로딩 실패:', error);
    }
  }, [user]);

  useEffect(() => {
    const targetId = roomIdParam ? Number(roomIdParam) : undefined;
    loadRoomsAndSelect(targetId);
    if (roomIdParam) {
      setSearchParams({}, { replace: true });
    }
  }, [roomIdParam]);

  // 그룹 채팅방 목록 로드
  const loadGroupRooms = useCallback(async () => {
    if (!user) return;
    try {
      const data = await groupChatAPI.getMyRooms(user.userId);
      setGroupRooms(data);
    } catch (error) {
      console.error('그룹 채팅방 목록 로딩 실패:', error);
    }
  }, [user]);

  useEffect(() => {
    loadGroupRooms();
  }, [loadGroupRooms]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, groupMessages]);

  // WebSocket 연결 (1:1)
  useEffect(() => {
    if (activeTab !== 'dm' || !selectedRoom) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe(`/topic/chat/${selectedRoom.id}`, (message) => {
          const newMsg: ChatMessageResponse = JSON.parse(message.body);
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          loadRoomsAndSelect();
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [activeTab, selectedRoom?.id]);

  // WebSocket 연결 (그룹)
  useEffect(() => {
    if (activeTab !== 'group' || !selectedGroupRoom) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe(`/topic/group-chat/${selectedGroupRoom.id}`, (message) => {
          const newMsg: GroupChatMessageResponse = JSON.parse(message.body);
          setGroupMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          loadGroupRooms();
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [activeTab, selectedGroupRoom?.id]);

  const handleSelectRoom = async (room: ChatRoomResponse) => {
    if (!user) return;
    setSelectedRoom(room);
    try {
      const data = await chatAPI.getMessages(room.id, user.userId);
      setMessages(data);
      loadRoomsAndSelect();
    } catch (error) {
      console.error('메시지 로딩 실패:', error);
    }
  };

  const handleSelectGroupRoom = async (room: GroupChatRoomResponse) => {
    if (!user) return;
    setSelectedGroupRoom(room);
    try {
      const data = await groupChatAPI.getMessages(room.id, user.userId);
      setGroupMessages(data);
    } catch (error) {
      console.error('그룹 메시지 로딩 실패:', error);
    }
  };

  const handleSend = async () => {
    if (!user || !inputValue.trim()) return;

    if (activeTab === 'dm' && selectedRoom) {
      try {
        setSending(true);
        const msg = await chatAPI.sendMessage(selectedRoom.id, user.userId, inputValue.trim());
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setInputValue('');
        loadRoomsAndSelect();
      } catch (error) {
        console.error('메시지 전송 실패:', error);
      } finally {
        setSending(false);
      }
    } else if (activeTab === 'group' && selectedGroupRoom) {
      try {
        setSending(true);
        const msg = await groupChatAPI.sendMessage(selectedGroupRoom.id, user.userId, inputValue.trim());
        setGroupMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setInputValue('');
        loadGroupRooms();
      } catch (error) {
        console.error('그룹 메시지 전송 실패:', error);
      } finally {
        setSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 그룹 채팅방 생성
  const handleOpenCreateGroup = async () => {
    if (!user) return;
    setShowCreateGroup(true);
    setGroupName('');
    setSelectedMembers([]);
    setClassmatesLoaded(false);
    try {
      const profile = await userAPI.getProfile(user.userId);
      if (profile.schools && profile.schools.length > 0) {
        const school = profile.schools[0];
        const data = await userAPI.searchClassmates(user.userId, school.schoolCode || school.schoolName, school.graduationYear);
        setClassmates(data.classmates);
      }
    } catch (error) {
      console.error('동창 목록 로딩 실패:', error);
    } finally {
      setClassmatesLoaded(true);
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedMembers.length === 0) return;
    try {
      setCreatingGroup(true);
      const room = await groupChatAPI.createRoom(user.userId, groupName.trim(), selectedMembers);
      setShowCreateGroup(false);
      await loadGroupRooms();
      setSelectedGroupRoom(room);
      const msgs = await groupChatAPI.getMessages(room.id, user.userId);
      setGroupMessages(msgs);
    } catch (error) {
      console.error('그룹 채팅방 생성 실패:', error);
    } finally {
      setCreatingGroup(false);
    }
  };

  // 그룹 채팅방 멤버 초대
  const handleOpenInvite = async () => {
    if (!user || !selectedGroupRoom) return;
    setShowInviteModal(true);
    setSelectedInviteMembers([]);
    try {
      const profile = await userAPI.getProfile(user.userId);
      if (profile.schools && profile.schools.length > 0) {
        const school = profile.schools[0];
        const data = await userAPI.searchClassmates(user.userId, school.schoolCode || school.schoolName, school.graduationYear);
        // 이미 채팅방에 있는 멤버 제외
        const existingMemberIds = selectedGroupRoom.members.map(m => m.userId);
        const filteredClassmates = data.classmates.filter(c => !existingMemberIds.includes(c.userId));
        setInviteClassmates(filteredClassmates);
      }
    } catch (error) {
      console.error('동창 목록 로딩 실패:', error);
    }
  };

  const handleToggleInviteMember = (userId: string) => {
    setSelectedInviteMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleInviteMembers = async () => {
    if (!user || !selectedGroupRoom || selectedInviteMembers.length === 0) return;
    try {
      setInviting(true);
      for (const memberId of selectedInviteMembers) {
        await groupChatAPI.inviteMember(selectedGroupRoom.id, user.userId, memberId);
      }
      setShowInviteModal(false);
      // 방 정보 갱신
      await loadGroupRooms();
      const rooms = await groupChatAPI.getMyRooms(user.userId);
      const updatedRoom = rooms.find(r => r.id === selectedGroupRoom.id);
      if (updatedRoom) {
        setSelectedGroupRoom(updatedRoom);
      }
    } catch (error) {
      console.error('멤버 초대 실패:', error);
      setModal({ type: 'error', message: '멤버 초대에 실패했습니다.', onConfirm: () => setModal(null) });
    } finally {
      setInviting(false);
    }
  };

  // 1:1 채팅방 나가기
  const handleLeaveDM = async () => {
    if (!user || !selectedRoom) return;

    const otherName = selectedRoom.otherUser.name;
    setModal({
      type: 'confirm',
      message: `${otherName}님과의 채팅방을 나가시겠습니까?\n대화 내용이 삭제됩니다.`,
      confirmText: '나가기',
      onConfirm: async () => {
        setModal(null);
        try {
          await chatAPI.leaveRoom(selectedRoom.id, user.userId);
          setSelectedRoom(null);
          setMessages([]);
          loadRoomsAndSelect();
          setModal({ type: 'success', message: `${otherName}님과의 채팅방을 나갔습니다.`, onConfirm: () => setModal(null) });
        } catch (error) {
          console.error('채팅방 나가기 실패:', error);
          setModal({ type: 'error', message: '채팅방 나가기에 실패했습니다.', onConfirm: () => setModal(null) });
        }
      },
      onCancel: () => setModal(null),
    });
  };

  // 그룹 채팅 멤버 강퇴
  const handleKickMember = async (targetUserId: string, targetName: string) => {
    if (!user || !selectedGroupRoom) return;

    setModal({
      type: 'confirm',
      message: `${targetName}님을 채팅방에서 강퇴하시겠습니까?`,
      confirmText: '강퇴',
      onConfirm: async () => {
        setModal(null);
        try {
          await groupChatAPI.kickMember(selectedGroupRoom.id, user.userId, targetUserId);
          // 방 정보 갱신
          await loadGroupRooms();
          const rooms = await groupChatAPI.getMyRooms(user.userId);
          const updatedRoom = rooms.find(r => r.id === selectedGroupRoom.id);
          if (updatedRoom) {
            setSelectedGroupRoom(updatedRoom);
          }
          setModal({ type: 'success', message: `${targetName}님을 강퇴했습니다.`, onConfirm: () => setModal(null) });
        } catch (error) {
          console.error('멤버 강퇴 실패:', error);
          setModal({ type: 'error', message: '멤버 강퇴에 실패했습니다.', onConfirm: () => setModal(null) });
        }
      },
      onCancel: () => setModal(null),
    });
  };

  const handleLeaveGroup = async () => {
    if (!user || !selectedGroupRoom) return;

    const roomName = selectedGroupRoom.name;
    setModal({
      type: 'confirm',
      message: '정말 이 채팅방을 나가시겠습니까?',
      confirmText: '나가기',
      onConfirm: async () => {
        setModal(null);
        try {
          await groupChatAPI.leaveRoom(selectedGroupRoom.id, user.userId);
          setSelectedGroupRoom(null);
          setGroupMessages([]);
          loadGroupRooms();
          setModal({ type: 'success', message: `'${roomName}' 채팅방을 나갔습니다.`, onConfirm: () => setModal(null) });
        } catch (error) {
          console.error('채팅방 나가기 실패:', error);
          setModal({ type: 'error', message: '채팅방 나가기에 실패했습니다.', onConfirm: () => setModal(null) });
        }
      },
      onCancel: () => setModal(null),
    });
  };

  // 탭 전환 시 선택 초기화
  const handleTabChange = (tab: ChatTab) => {
    setActiveTab(tab);
    setInputValue('');
    if (tab === 'dm') {
      setSelectedGroupRoom(null);
      setGroupMessages([]);
    } else {
      setSelectedRoom(null);
      setMessages([]);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return formatTime(dateString);
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  if (!user) return null;

  const isRoomSelected = activeTab === 'dm' ? !!selectedRoom : !!selectedGroupRoom;

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
    <div className="chat-container">
      {/* 채팅방 목록 사이드바 */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="chat-tabs">
            <button
              className={`chat-tab ${activeTab === 'dm' ? 'active' : ''}`}
              onClick={() => handleTabChange('dm')}
            >
              1:1 채팅
            </button>
            <button
              className={`chat-tab ${activeTab === 'group' ? 'active' : ''}`}
              onClick={() => handleTabChange('group')}
            >
              그룹채팅
            </button>
          </div>
          {activeTab === 'group' && (
            <button className="chat-create-group-btn" onClick={handleOpenCreateGroup}>
              +
            </button>
          )}
        </div>

        <div className="chat-room-list">
          {activeTab === 'dm' ? (
            rooms.length === 0 ? (
              <div className="chat-room-empty">
                채팅방이 없습니다.<br />
                동창 프로필에서 채팅을 시작하세요!
              </div>
            ) : (
              rooms.map(room => (
                <div
                  key={room.id}
                  className={`chat-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                  onClick={() => handleSelectRoom(room)}
                >
                  <div className="chat-room-avatar">
                    {room.otherUser.profileImageUrl ? (
                      <img src={room.otherUser.profileImageUrl} alt={room.otherUser.name} />
                    ) : (
                      <span>{room.otherUser.name[0]}</span>
                    )}
                  </div>
                  <div className="chat-room-info">
                    <div className="chat-room-name">{room.otherUser.name}</div>
                    <div className="chat-room-last-msg">
                      {room.lastMessage || '대화를 시작하세요'}
                    </div>
                  </div>
                  <div className="chat-room-meta">
                    {room.lastMessageAt && (
                      <span className="chat-room-time">{formatDate(room.lastMessageAt)}</span>
                    )}
                    {room.unreadCount > 0 && (
                      <span className="chat-room-unread">{room.unreadCount}</span>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            groupRooms.length === 0 ? (
              <div className="chat-room-empty">
                그룹 채팅방이 없습니다.<br />
                + 버튼을 눌러 새 그룹을 만들어보세요!
              </div>
            ) : (
              groupRooms.map(room => (
                <div
                  key={room.id}
                  className={`chat-room-item ${selectedGroupRoom?.id === room.id ? 'active' : ''}`}
                  onClick={() => handleSelectGroupRoom(room)}
                >
                  <div className="chat-room-avatar group-avatar">
                    <span>{room.memberCount}</span>
                  </div>
                  <div className="chat-room-info">
                    <div className="chat-room-name">
                      {room.name}
                      <span className="chat-room-member-count">{room.memberCount}</span>
                    </div>
                    <div className="chat-room-last-msg">
                      {room.lastMessage || '대화를 시작하세요'}
                    </div>
                  </div>
                  <div className="chat-room-meta">
                    {room.lastMessageAt && (
                      <span className="chat-room-time">{formatDate(room.lastMessageAt)}</span>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* 채팅 메시지 영역 */}
      <div className="chat-main">
        {isRoomSelected ? (
          <>
            {/* 헤더 */}
            {activeTab === 'dm' && selectedRoom && (
              <div className="chat-main-header">
                <div className="chat-main-header-avatar">
                  {selectedRoom.otherUser.profileImageUrl ? (
                    <img src={selectedRoom.otherUser.profileImageUrl} alt={selectedRoom.otherUser.name} />
                  ) : (
                    <span>{selectedRoom.otherUser.name[0]}</span>
                  )}
                </div>
                <div className="chat-main-header-info">
                  <h3>{selectedRoom.otherUser.name}</h3>
                </div>
                <button className="chat-leave-btn" onClick={handleLeaveDM} title="채팅방 나가기">
                  나가기
                </button>
              </div>
            )}
            {activeTab === 'group' && selectedGroupRoom && (
              <div className="chat-main-header">
                <div className="chat-main-header-avatar group-avatar">
                  <span>{selectedGroupRoom.memberCount}</span>
                </div>
                <div className="chat-main-header-info">
                  <h3>{selectedGroupRoom.name}</h3>
                  <span className="chat-main-header-members">
                    {selectedGroupRoom.members.map(m => m.name).join(', ')}
                  </span>
                </div>
                <button className="chat-invite-btn" onClick={handleOpenInvite} title="멤버 초대">
                  초대
                </button>
                <button className="chat-member-manage-btn" onClick={() => setShowMemberModal(true)} title="멤버 관리">
                  멤버
                </button>
                <button className="chat-leave-btn" onClick={handleLeaveGroup} title="채팅방 나가기">
                  나가기
                </button>
              </div>
            )}

            {/* 메시지 영역 */}
            <div className="chat-messages">
              {activeTab === 'dm' ? (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`chat-message ${msg.senderUserId === user.userId ? 'mine' : 'theirs'}`}
                  >
                    {msg.senderUserId !== user.userId && (
                      <div className="chat-message-sender">{msg.senderName}</div>
                    )}
                    <div className="chat-message-bubble">
                      <div className="chat-message-content">{msg.content}</div>
                      <div className="chat-message-meta">
                        {msg.senderUserId === user.userId && !msg.isRead && (
                          <span className="chat-message-unread">1</span>
                        )}
                        <span className="chat-message-time">{formatTime(msg.sentAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                groupMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`chat-message ${msg.senderUserId === user.userId ? 'mine' : 'theirs'}`}
                  >
                    {msg.senderUserId !== user.userId && (
                      <div className="chat-message-sender">{msg.senderName}</div>
                    )}
                    <div className="chat-message-bubble">
                      <div className="chat-message-content">{msg.content}</div>
                      <div className="chat-message-meta">
                        {msg.senderUserId === user.userId && msg.unreadCount > 0 && (
                          <span className="chat-message-unread">{msg.unreadCount}</span>
                        )}
                        <span className="chat-message-time">{formatTime(msg.sentAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                placeholder="메시지를 입력하세요..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={sending}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={sending || !inputValue.trim()}
              >
                전송
              </button>
            </div>
          </>
        ) : (
          <div className="chat-no-selection">
            <div className="chat-no-selection-icon">💬</div>
            <p>{activeTab === 'dm' ? '채팅방을 선택하세요' : '그룹 채팅방을 선택하세요'}</p>
          </div>
        )}
      </div>

      {/* 그룹 채팅방 생성 모달 */}
      {showCreateGroup && (
        <div className="chat-modal-backdrop" onClick={() => setShowCreateGroup(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>그룹 채팅 만들기</h3>
              <button className="chat-modal-close" onClick={() => setShowCreateGroup(false)}>×</button>
            </div>
            <div className="chat-modal-body">
              <div className="chat-modal-field">
                <label>채팅방 이름</label>
                <input
                  type="text"
                  placeholder="그룹 이름을 입력하세요"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="chat-modal-input"
                />
              </div>
              <div className="chat-modal-field">
                <label>멤버 선택 ({selectedMembers.length}명 선택됨)</label>
                <div className="chat-modal-member-list">
                  {classmates.map(c => (
                    <div
                      key={c.userId}
                      className={`chat-modal-member-item ${selectedMembers.includes(c.userId) ? 'selected' : ''}`}
                      onClick={() => handleToggleMember(c.userId)}
                    >
                      <div className="chat-modal-member-avatar">
                        {c.profileImageUrl ? (
                          <img src={c.profileImageUrl} alt={c.name} />
                        ) : (
                          <span>{c.name[0]}</span>
                        )}
                      </div>
                      <span className="chat-modal-member-name">{c.name}</span>
                      <div className={`chat-modal-member-check ${selectedMembers.includes(c.userId) ? 'checked' : ''}`}>
                        {selectedMembers.includes(c.userId) ? '✓' : ''}
                      </div>
                    </div>
                  ))}
                  {classmates.length === 0 && (
                    <div className="chat-modal-empty">
                      {classmatesLoaded ? '등록된 동창이 없습니다.' : '동창 목록을 불러오는 중...'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="chat-modal-footer">
              <button className="chat-modal-cancel" onClick={() => setShowCreateGroup(false)}>
                취소
              </button>
              <button
                className="chat-modal-confirm"
                onClick={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0}
              >
                {creatingGroup ? '생성 중...' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 멤버 초대 모달 */}
      {showInviteModal && (
        <div className="chat-modal-backdrop" onClick={() => setShowInviteModal(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>멤버 초대</h3>
              <button className="chat-modal-close" onClick={() => setShowInviteModal(false)}>×</button>
            </div>
            <div className="chat-modal-body">
              <div className="chat-modal-field">
                <label>초대할 멤버 선택 ({selectedInviteMembers.length}명 선택됨)</label>
                <div className="chat-modal-member-list">
                  {inviteClassmates.map(c => (
                    <div
                      key={c.userId}
                      className={`chat-modal-member-item ${selectedInviteMembers.includes(c.userId) ? 'selected' : ''}`}
                      onClick={() => handleToggleInviteMember(c.userId)}
                    >
                      <div className="chat-modal-member-avatar">
                        {c.profileImageUrl ? (
                          <img src={c.profileImageUrl} alt={c.name} />
                        ) : (
                          <span>{c.name[0]}</span>
                        )}
                      </div>
                      <span className="chat-modal-member-name">{c.name}</span>
                      <div className={`chat-modal-member-check ${selectedInviteMembers.includes(c.userId) ? 'checked' : ''}`}>
                        {selectedInviteMembers.includes(c.userId) ? '✓' : ''}
                      </div>
                    </div>
                  ))}
                  {inviteClassmates.length === 0 && (
                    <div className="chat-modal-empty">초대할 수 있는 동창이 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="chat-modal-footer">
              <button className="chat-modal-cancel" onClick={() => setShowInviteModal(false)}>
                취소
              </button>
              <button
                className="chat-modal-confirm"
                onClick={handleInviteMembers}
                disabled={inviting || selectedInviteMembers.length === 0}
              >
                {inviting ? '초대 중...' : '초대하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 멤버 관리 모달 (강퇴) */}
      {showMemberModal && selectedGroupRoom && (
        <div className="chat-modal-backdrop" onClick={() => setShowMemberModal(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>멤버 관리</h3>
              <button className="chat-modal-close" onClick={() => setShowMemberModal(false)}>×</button>
            </div>
            <div className="chat-modal-body">
              <div className="chat-modal-field">
                <label>멤버 목록 ({selectedGroupRoom.memberCount}명)</label>
                <div className="chat-modal-member-list">
                  {selectedGroupRoom.members.map(member => {
                    const isMe = member.userId === user.userId;
                    const isCreator = selectedGroupRoom.createdBy === member.userId;
                    const canKick = !isMe && (selectedGroupRoom.createdBy === user.userId || !selectedGroupRoom.createdBy);
                    return (
                      <div key={member.userId} className="chat-modal-member-item chat-member-manage-item">
                        <div className="chat-modal-member-avatar">
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt={member.name} />
                          ) : (
                            <span>{member.name[0]}</span>
                          )}
                        </div>
                        <span className="chat-modal-member-name">
                          {member.name}
                          {isMe && <span className="chat-member-badge me">나</span>}
                          {isCreator && <span className="chat-member-badge creator">방장</span>}
                        </span>
                        {canKick && (
                          <button
                            className="chat-kick-btn"
                            onClick={() => handleKickMember(member.userId, member.name)}
                          >
                            강퇴
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="chat-modal-footer">
              <button className="chat-modal-cancel" onClick={() => setShowMemberModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
