import React from 'react';
import './Retro2000s_v1.css';

const Retro2000s_v1: React.FC = () => {
  return (
    <div className="retro-v1-container">
      {/* Header with gradient background - typical 2000s style */}
      <header className="retro-v1-header">
        <div className="header-content">
          <h1 className="site-title">
            <span className="title-icon">★</span>
            우리반
            <span className="title-icon">★</span>
          </h1>
          <p className="site-slogan">추억 속 그 친구를 만나보세요!</p>
        </div>
        <nav className="retro-nav">
          <a href="#home">홈</a>
          <a href="#search">동창찾기</a>
          <a href="#board">게시판</a>
          <a href="#login">로그인</a>
          <a href="#join">회원가입</a>
        </nav>
      </header>

      {/* Main content with table-based layout */}
      <div className="retro-v1-main">
        {/* Left sidebar */}
        <aside className="retro-sidebar">
          <div className="sidebar-box">
            <h3>🏫 인기 학교</h3>
            <ul>
              <li>서울고등학교</li>
              <li>경기중학교</li>
              <li>부산여자고등학교</li>
              <li>대전초등학교</li>
            </ul>
          </div>

          <div className="sidebar-box">
            <h3>📢 공지사항</h3>
            <ul>
              <li>서비스 오픈!</li>
              <li>이용약관 안내</li>
              <li>이벤트 진행중</li>
            </ul>
          </div>
        </aside>

        {/* Center content */}
        <main className="retro-content">
          <div className="welcome-box">
            <h2>🎓 동창을 찾아드립니다</h2>
            <p>초등학교, 중학교, 고등학교 친구들을 찾아보세요!</p>
          </div>

          <div className="search-box">
            <h3>빠른 검색</h3>
            <table className="search-table">
              <tbody>
                <tr>
                  <td className="label">학교명:</td>
                  <td><input type="text" placeholder="학교 이름을 입력하세요" /></td>
                </tr>
                <tr>
                  <td className="label">졸업년도:</td>
                  <td>
                    <select>
                      <option>선택하세요</option>
                      <option>2000년</option>
                      <option>2001년</option>
                      <option>2002년</option>
                      <option>2003년</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="button-cell">
                    <button className="retro-button">검색하기</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="stats-box">
            <div className="stat-item">
              <div className="stat-number">12,345</div>
              <div className="stat-label">전체 회원</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">987</div>
              <div className="stat-label">오늘 가입</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">5,432</div>
              <div className="stat-label">접속중</div>
            </div>
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="retro-sidebar-right">
          <div className="sidebar-box">
            <h3>💝 최근 가입자</h3>
            <ul>
              <li>철수님 (서울고)</li>
              <li>영희님 (부산중)</li>
              <li>민수님 (대전고)</li>
            </ul>
          </div>

          <div className="sidebar-box ad-box">
            <h3>광고</h3>
            <div className="ad-placeholder">
              배너 광고
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="retro-v1-footer">
        <p>Copyright ⓒ 2000 우리반. All rights reserved.</p>
        <p>이용약관 | 개인정보처리방침 | 고객센터</p>
      </footer>

      {/* Floating popup - very 2000s! */}
      <div className="floating-popup">
        <div className="popup-header">이벤트 안내</div>
        <div className="popup-content">
          회원가입하고<br />경품 받으세요!
        </div>
        <button className="popup-close">X</button>
      </div>
    </div>
  );
};

export default Retro2000s_v1;
