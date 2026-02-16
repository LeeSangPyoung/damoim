import React from 'react';
import './Modern_v2.css';

const Modern_v2: React.FC = () => {
  return (
    <div className="modern-v2-container">
      {/* App-style header */}
      <header className="app-header">
        <div className="header-wrapper">
          <div className="brand">
            <div className="brand-icon">🎓</div>
            <span className="brand-name">우리반</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn">
              <span>🔔</span>
            </button>
            <button className="icon-btn">
              <span>💬</span>
            </button>
            <div className="user-profile">
              <div className="profile-pic">👤</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="app-main">
        {/* Left sidebar */}
        <aside className="left-sidebar">
          <nav className="side-nav">
            <a href="#home" className="nav-item active">
              <span className="nav-icon">🏠</span>
              <span>홈</span>
            </a>
            <a href="#search" className="nav-item">
              <span className="nav-icon">🔍</span>
              <span>동창찾기</span>
            </a>
            <a href="#messages" className="nav-item">
              <span className="nav-icon">💬</span>
              <span>메시지</span>
            </a>
            <a href="#groups" className="nav-item">
              <span className="nav-icon">👥</span>
              <span>그룹채팅</span>
            </a>
            <a href="#boards" className="nav-item">
              <span className="nav-icon">📋</span>
              <span>게시판</span>
            </a>
          </nav>

          <div className="sidebar-widget">
            <h3>내 학교</h3>
            <div className="my-school-list">
              <div className="school-item">
                <div className="school-emoji">🏫</div>
                <div className="school-details">
                  <div className="school-title">서울고등학교</div>
                  <div className="school-year">2010년 졸업</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center feed */}
        <main className="main-feed">
          {/* Search box */}
          <div className="feed-card search-widget">
            <h2>동창을 찾아보세요</h2>
            <div className="quick-search">
              <input
                type="text"
                placeholder="학교 이름으로 검색..."
                className="feed-input"
              />
              <button className="btn-primary">검색</button>
            </div>
            <div className="filter-chips">
              <button className="chip">초등학교</button>
              <button className="chip">중학교</button>
              <button className="chip">고등학교</button>
              <button className="chip">대학교</button>
            </div>
          </div>

          {/* Activity feed */}
          <div className="feed-card">
            <div className="feed-header">
              <h3>최근 활동</h3>
              <button className="text-btn">모두 보기</button>
            </div>

            <div className="feed-item">
              <div className="feed-avatar">김</div>
              <div className="feed-content">
                <div className="feed-user">
                  <span className="user-name">김민수</span>
                  <span className="user-badge">서울고 10학번</span>
                </div>
                <div className="feed-text">
                  오랜만에 학교 친구들 찾았습니다! 😊
                </div>
                <div className="feed-meta">5분 전</div>
              </div>
            </div>

            <div className="feed-item">
              <div className="feed-avatar">이</div>
              <div className="feed-content">
                <div className="feed-user">
                  <span className="user-name">이영희</span>
                  <span className="user-badge">부산여고 12학번</span>
                </div>
                <div className="feed-text">
                  10년만에 반 친구들과 단체 채팅방 만들었어요 ㅎㅎ
                </div>
                <div className="feed-meta">1시간 전</div>
              </div>
            </div>

            <div className="feed-item">
              <div className="feed-avatar">박</div>
              <div className="feed-content">
                <div className="feed-user">
                  <span className="user-name">박철수</span>
                  <span className="user-badge">대전중 08학번</span>
                </div>
                <div className="feed-text">
                  우리 학교 동문회 게시판 개설했습니다!
                </div>
                <div className="feed-meta">3시간 전</div>
              </div>
            </div>
          </div>

          {/* Popular groups */}
          <div className="feed-card">
            <div className="feed-header">
              <h3>인기 그룹채팅</h3>
            </div>

            <div className="group-list">
              <div className="group-item">
                <div className="group-icon">💬</div>
                <div className="group-info">
                  <div className="group-name">서울고 2010학번 모임</div>
                  <div className="group-members">125명 참여중</div>
                </div>
                <button className="btn-join">참여</button>
              </div>

              <div className="group-item">
                <div className="group-icon">💬</div>
                <div className="group-info">
                  <div className="group-name">경기중 3학년 5반</div>
                  <div className="group-members">32명 참여중</div>
                </div>
                <button className="btn-join">참여</button>
              </div>
            </div>
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="right-sidebar">
          {/* Suggestions */}
          <div className="widget">
            <h3>추천 친구</h3>
            <div className="suggestion-list">
              <div className="suggestion-item">
                <div className="suggestion-avatar">최</div>
                <div className="suggestion-info">
                  <div className="suggestion-name">최수정</div>
                  <div className="suggestion-detail">서울고 2010</div>
                </div>
                <button className="btn-small">추가</button>
              </div>

              <div className="suggestion-item">
                <div className="suggestion-avatar">정</div>
                <div className="suggestion-info">
                  <div className="suggestion-name">정민호</div>
                  <div className="suggestion-detail">서울고 2010</div>
                </div>
                <button className="btn-small">추가</button>
              </div>

              <div className="suggestion-item">
                <div className="suggestion-avatar">강</div>
                <div className="suggestion-info">
                  <div className="suggestion-name">강혜진</div>
                  <div className="suggestion-detail">서울고 2010</div>
                </div>
                <button className="btn-small">추가</button>
              </div>
            </div>
          </div>

          {/* Trending schools */}
          <div className="widget">
            <h3>인기 학교</h3>
            <div className="trending-list">
              <div className="trending-item">
                <span className="trending-rank">1</span>
                <span className="trending-name">서울고등학교</span>
              </div>
              <div className="trending-item">
                <span className="trending-rank">2</span>
                <span className="trending-name">경기중학교</span>
              </div>
              <div className="trending-item">
                <span className="trending-rank">3</span>
                <span className="trending-name">부산여자고</span>
              </div>
              <div className="trending-item">
                <span className="trending-rank">4</span>
                <span className="trending-name">대전초등학교</span>
              </div>
            </div>
          </div>

          {/* Stats widget */}
          <div className="widget stats-widget">
            <div className="stat-mini">
              <div className="stat-mini-value">12.3K</div>
              <div className="stat-mini-label">회원</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">3.4K</div>
              <div className="stat-mini-label">학교</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">8.9K</div>
              <div className="stat-mini-label">재회</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Modern_v2;
