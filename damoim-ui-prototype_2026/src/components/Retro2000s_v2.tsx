import React from 'react';
import './Retro2000s_v2.css';

const Retro2000s_v2: React.FC = () => {
  return (
    <div className="retro-v2-container">
      {/* Top decorative bar */}
      <div className="deco-bar">
        <span>♥</span>
        <span>★</span>
        <span>♪</span>
        <span>♥</span>
        <span>★</span>
        <span>♪</span>
        <span>♥</span>
        <span>★</span>
        <span>♪</span>
      </div>

      {/* Mini homepage style header */}
      <header className="retro-v2-header">
        <div className="header-box">
          <div className="logo-area">
            <h1 className="site-logo">우리반</h1>
            <p className="tagline">우리들의 추억 그 시절로...</p>
          </div>
        </div>
      </header>

      {/* Navigation tabs - mini homepage style */}
      <nav className="mini-tabs">
        <div className="tab active">홈</div>
        <div className="tab">프로필</div>
        <div className="tab">동창찾기</div>
        <div className="tab">게시판</div>
        <div className="tab">방명록</div>
      </nav>

      {/* Main content */}
      <div className="retro-v2-main">
        {/* Welcome message box */}
        <div className="welcome-banner">
          <h2>┏━━━━━━━━━━━━━━━━━━━┓</h2>
          <p className="welcome-text">
            ♡ 친구를 찾아 떠나는 추억여행 ♡
          </p>
          <p className="sub-text">초 · 중 · 고 동창생을 만나보세요</p>
          <h2>┗━━━━━━━━━━━━━━━━━━━┛</h2>
        </div>

        {/* Content boxes */}
        <div className="content-grid">
          {/* Search box with cute design */}
          <div className="mini-box search-section">
            <div className="box-title">
              <span className="icon">🔍</span> 동창 검색하기
            </div>
            <div className="box-content">
              <div className="form-group">
                <label>학교 이름</label>
                <input
                  type="text"
                  placeholder="예) 서울고등학교"
                  className="cute-input"
                />
              </div>
              <div className="form-group">
                <label>졸업 년도</label>
                <select className="cute-input">
                  <option>선택해주세요 ♥</option>
                  <option>2000년</option>
                  <option>2001년</option>
                  <option>2002년</option>
                  <option>2003년</option>
                  <option>2004년</option>
                  <option>2005년</option>
                </select>
              </div>
              <button className="cute-button">
                ♥ 검색하기 ♥
              </button>
            </div>
          </div>

          {/* Today's visitors */}
          <div className="mini-box">
            <div className="box-title">
              <span className="icon">📊</span> TODAY
            </div>
            <div className="box-content center">
              <div className="counter-display">
                <div className="counter">1,234</div>
                <div className="counter-label">오늘 방문자</div>
              </div>
              <div className="divider">|</div>
              <div className="counter-display">
                <div className="counter">9,876</div>
                <div className="counter-label">전체 방문자</div>
              </div>
            </div>
          </div>

          {/* Recent members */}
          <div className="mini-box">
            <div className="box-title">
              <span className="icon">👥</span> 최근 가입자
            </div>
            <div className="box-content">
              <ul className="member-list">
                <li>
                  <span className="dot">●</span>
                  <span>민수님</span>
                  <span className="school">(서울고)</span>
                </li>
                <li>
                  <span className="dot">●</span>
                  <span>영희님</span>
                  <span className="school">(부산여고)</span>
                </li>
                <li>
                  <span className="dot">●</span>
                  <span>철수님</span>
                  <span className="school">(대전중)</span>
                </li>
                <li>
                  <span className="dot">●</span>
                  <span>미선님</span>
                  <span className="school">(광주고)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Popular schools */}
          <div className="mini-box">
            <div className="box-title">
              <span className="icon">🏫</span> 인기 학교
            </div>
            <div className="box-content">
              <ul className="school-list">
                <li><span className="rank">1</span> 서울고등학교</li>
                <li><span className="rank">2</span> 경기중학교</li>
                <li><span className="rank">3</span> 부산여자고등학교</li>
                <li><span className="rank">4</span> 대전초등학교</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Login box */}
        <div className="login-section">
          <div className="mini-box login-box">
            <div className="box-title">
              <span className="icon">🔐</span> 로그인
            </div>
            <div className="box-content">
              <input type="text" placeholder="아이디" className="cute-input" />
              <input type="password" placeholder="비밀번호" className="cute-input" />
              <div className="button-row">
                <button className="cute-button small">로그인</button>
                <button className="cute-button small outline">회원가입</button>
              </div>
            </div>
          </div>
        </div>

        {/* Guestbook preview */}
        <div className="guestbook-preview">
          <div className="box-title">
            <span className="icon">📝</span> 방명록
          </div>
          <div className="guestbook-content">
            <div className="guest-entry">
              <span className="guest-name">철수</span>
              <span className="guest-message">안녕하세요! 좋은 사이트네요 ^^</span>
              <span className="guest-date">2000.03.15</span>
            </div>
            <div className="guest-entry">
              <span className="guest-name">영희</span>
              <span className="guest-message">친구 찾았어요! 감사합니다~♡</span>
              <span className="guest-date">2000.03.14</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with cute design */}
      <footer className="retro-v2-footer">
        <div className="footer-deco">～～～ ♥ ～～～</div>
        <p>ⓒ 2000 우리반 | 추억을 함께 나누는 공간</p>
        <p className="footer-links">
          이용약관 · 개인정보보호 · 문의하기
        </p>
        <div className="footer-deco">～～～ ★ ～～～</div>
      </footer>

      {/* Background music player (visual only) */}
      <div className="bgm-player">
        <div className="bgm-title">♪ BGM Player</div>
        <div className="bgm-controls">
          ◀◀ ▶ ▶▶
        </div>
      </div>
    </div>
  );
};

export default Retro2000s_v2;
