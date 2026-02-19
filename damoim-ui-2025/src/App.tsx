import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Signup from './components/Signup';
import FindId from './components/FindId';
import FindPassword from './components/FindPassword';
import SchoolDashboard from './components/SchoolDashboard';
import Board from './components/Board';
import Search from './components/Search';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import MessageNotificationModal from './components/MessageNotificationModal';
import Layout from './components/Layout';
import ProfileEdit from './components/ProfileEdit';
import ClassmateList from './components/ClassmateList';
import { getAuthData } from './utils/auth';
import { messageAPI, MessageResponse } from './api/message';

function Home() {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1>우리반 UI 프로토타입</h1>
        <p>8가지 디자인 버전을 비교해보세요 (하이브리드 4종 포함)</p>
      </div>

      <div className="versions-grid">
        <Link to="/retro-v1" className="version-card retro">
          <div className="card-badge">2000년대 감성</div>
          <h2>Retro Version 1</h2>
          <p>클래식 우리반 스타일</p>
          <ul>
            <li>테이블 레이아웃</li>
            <li>그라데이션 헤더</li>
            <li>투박한 버튼</li>
            <li>팝업창 애니메이션</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>

        <Link to="/retro-v2" className="version-card retro">
          <div className="card-badge">2000년대 감성</div>
          <h2>Retro Version 2</h2>
          <p>싸이월드 미니홈피 느낌</p>
          <ul>
            <li>파스텔 컬러</li>
            <li>귀여운 디자인</li>
            <li>미니홈피 탭</li>
            <li>BGM 플레이어</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>

        <Link to="/modern-v1" className="version-card modern">
          <div className="card-badge modern">최신 감성</div>
          <h2>Modern Version 1</h2>
          <p>클린 미니멀 디자인</p>
          <ul>
            <li>현대적 레이아웃</li>
            <li>미니멀 UI</li>
            <li>부드러운 그림자</li>
            <li>세련된 타이포그래피</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>

        <Link to="/modern-v2" className="version-card modern">
          <div className="card-badge modern">최신 감성</div>
          <h2>Modern Version 2</h2>
          <p>SNS 스타일</p>
          <ul>
            <li>페이스북 느낌</li>
            <li>피드 중심 레이아웃</li>
            <li>3단 구조</li>
            <li>소셜 미디어 UX</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>

        <Link to="/hybrid" className="version-card hybrid">
          <div className="card-badge recommended">🌟 추천</div>
          <h2>Hybrid v1</h2>
          <p>복고와 현대의 조화</p>
          <ul>
            <li>레트로 감성 + 모던 UX</li>
            <li>노스탤지어 색감</li>
            <li>현대적 사용성</li>
            <li>독특한 아이덴티티</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>

        <Link to="/hybrid-v2" className="version-card hybrid">
          <div className="card-badge recommended">하이브리드</div>
          <h2>Hybrid v2</h2>
          <p>90년대 네온 + 현대</p>
          <ul>
            <li>네온 사인 효과</li>
            <li>다크 배경</li>
            <li>그리드 패턴</li>
            <li>사이버펑크 감성</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>

        <Link to="/hybrid-v3" className="version-card hybrid">
          <div className="card-badge recommended">하이브리드</div>
          <h2>Hybrid v3</h2>
          <p>다크 우아한 레트로</p>
          <ul>
            <li>다크 엘레강트</li>
            <li>보라-핑크 그라데이션</li>
            <li>미니멀 + 레트로</li>
            <li>세련된 느낌</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>

        <Link to="/hybrid-v4" className="version-card hybrid">
          <div className="card-badge recommended">하이브리드</div>
          <h2>Hybrid v4</h2>
          <p>따뜻한 오렌지 감성</p>
          <ul>
            <li>웜톤 오렌지 색상</li>
            <li>친근한 느낌</li>
            <li>부드러운 곡선</li>
            <li>포근한 분위기</li>
          </ul>
          <div className="view-btn">보기 →</div>
        </Link>
      </div>

      <div className="home-footer">
        <p>각 버전을 클릭하면 전체 페이지를 볼 수 있습니다</p>
        <p style={{marginTop: '1rem'}}>
          <Link to="/login" style={{color: '#f97316', fontWeight: 'bold', marginRight: '1rem'}}>로그인 페이지</Link>
          <Link to="/dashboard" style={{color: '#4169E1', fontWeight: 'bold'}}>대시보드 (포털 스타일)</Link>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [newMessage, setNewMessage] = useState<MessageResponse | null>(null);
  const [lastCheckedId, setLastCheckedId] = useState<number>(0);

  useEffect(() => {
    const checkNewMessages = async () => {
      const { user } = getAuthData();
      if (!user) return;

      try {
        const messages = await messageAPI.getReceivedMessages(user.userId);
        const unreadMessages = messages.filter(msg => !msg.read);

        if (unreadMessages.length > 0) {
          const latestMessage = unreadMessages[0];

          // 새로운 메시지인지 확인 (이전에 체크한 메시지보다 ID가 큰 경우)
          if (latestMessage.id > lastCheckedId) {
            setNewMessage(latestMessage);
            setLastCheckedId(latestMessage.id);
          }
        }
      } catch (error) {
        console.error('Failed to check new messages:', error);
      }
    };

    // 로그인 상태 확인
    const { user } = getAuthData();
    if (user) {
      // 첫 체크
      checkNewMessages();

      // 5초마다 체크
      const interval = setInterval(checkNewMessages, 5000);

      return () => clearInterval(interval);
    }
  }, [lastCheckedId]);

  const handleCloseNotification = () => {
    setNewMessage(null);
  };

  return (
    <BrowserRouter>
      {newMessage && (
        <MessageNotificationModal
          message={newMessage}
          onClose={handleCloseNotification}
        />
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/find-id" element={<FindId />} />
        <Route path="/find-password" element={<FindPassword />} />
        <Route path="/dashboard" element={<SchoolDashboard />} />
        <Route path="/board" element={<Board />} />
        <Route path="/search" element={<Search />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/classmates" element={<Layout><ClassmateList /></Layout>} />
        <Route path="/profile/edit" element={<Layout><ProfileEdit /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
