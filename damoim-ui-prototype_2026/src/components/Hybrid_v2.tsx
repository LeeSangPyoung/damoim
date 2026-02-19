import React from 'react';
import './Hybrid_v2.css';

const Hybrid_v2: React.FC = () => {
  return (
    <div className="hybrid2-container">
      {/* 90s neon header */}
      <header className="hybrid2-header">
        <div className="neon-border"></div>
        <div className="header-content">
          <div className="logo-area">
            <h1 className="neon-logo">우리반</h1>
            <span className="neon-subtitle">REUNION</span>
          </div>
          <nav className="neon-nav">
            <a href="#search">동창찾기</a>
            <a href="#chat">채팅</a>
            <a href="#board">게시판</a>
            <button className="btn-neon-login">LOGIN</button>
            <button className="btn-neon-join">JOIN</button>
          </nav>
        </div>
      </header>

      {/* Hero with grid pattern */}
      <section className="hero2">
        <div className="grid-bg"></div>
        <div className="hero2-container">
          <div className="hero2-badge">
            <span className="badge-text">EST. 2000</span>
          </div>
          <h1 className="hero2-title">
            추억 속 친구들과<br />
            다시 연결되는 순간
          </h1>
          <p className="hero2-desc">
            학창시절의 소중한 인연을 되살려보세요
          </p>

          {/* Neon search box */}
          <div className="neon-search-box">
            <div className="search-header">
              <span className="search-icon">⚡</span>
              <h3>QUICK SEARCH</h3>
            </div>
            <div className="search-content">
              <div className="neon-input-group">
                <input
                  type="text"
                  placeholder="학교 이름"
                  className="neon-input"
                />
              </div>
              <div className="neon-input-group">
                <select className="neon-input">
                  <option>졸업년도 선택</option>
                  <option>2000년</option>
                  <option>2001년</option>
                  <option>2002년</option>
                  <option>2003년</option>
                  <option>2004년</option>
                  <option>2005년</option>
                </select>
              </div>
              <button className="btn-neon-search">
                검색 START →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats with digital display */}
      <section className="stats2">
        <div className="container">
          <div className="stats2-grid">
            <div className="digital-stat">
              <div className="stat-label">MEMBERS</div>
              <div className="digital-number">12,345</div>
            </div>
            <div className="digital-stat">
              <div className="stat-label">SCHOOLS</div>
              <div className="digital-number">3,456</div>
            </div>
            <div className="digital-stat">
              <div className="stat-label">CHATROOMS</div>
              <div className="digital-number">987</div>
            </div>
            <div className="digital-stat">
              <div className="stat-label">REUNIONS</div>
              <div className="digital-number">8,901</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features2">
        <div className="container">
          <h2 className="section2-title">
            <span className="title-line"></span>
            FEATURES
            <span className="title-line"></span>
          </h2>

          <div className="features2-grid">
            <div className="neon-card">
              <div className="card-glow pink"></div>
              <div className="card-number">01</div>
              <div className="card-icon">🔍</div>
              <h3>동창 검색</h3>
              <p>학교와 졸업년도로 옛 친구를 찾을 수 있습니다</p>
            </div>

            <div className="neon-card">
              <div className="card-glow cyan"></div>
              <div className="card-number">02</div>
              <div className="card-icon">💬</div>
              <h3>실시간 채팅</h3>
              <p>찾은 친구와 바로 대화를 시작하세요</p>
            </div>

            <div className="neon-card">
              <div className="card-glow yellow"></div>
              <div className="card-number">03</div>
              <div className="card-icon">👥</div>
              <h3>그룹 채팅</h3>
              <p>같은 학번끼리 모여 추억을 나눠보세요</p>
            </div>

            <div className="neon-card">
              <div className="card-glow green"></div>
              <div className="card-number">04</div>
              <div className="card-icon">📋</div>
              <h3>게시판</h3>
              <p>학교별 게시판에서 소식을 공유하세요</p>
            </div>
          </div>
        </div>
      </section>

      {/* Activity */}
      <section className="activity2">
        <div className="container">
          <div className="activity2-grid">
            <div className="neon-panel">
              <div className="panel-header">
                <span>▶</span> NEW MEMBERS
              </div>
              <div className="panel-content">
                <div className="member2-item">
                  <div className="member2-avatar pink-glow">김</div>
                  <div className="member2-info">
                    <div className="member2-name">김민수</div>
                    <div className="member2-school">서울고 2010</div>
                  </div>
                  <div className="member2-badge">NEW</div>
                </div>
                <div className="member2-item">
                  <div className="member2-avatar cyan-glow">이</div>
                  <div className="member2-info">
                    <div className="member2-name">이영희</div>
                    <div className="member2-school">부산여고 2012</div>
                  </div>
                  <div className="member2-badge">NEW</div>
                </div>
                <div className="member2-item">
                  <div className="member2-avatar yellow-glow">박</div>
                  <div className="member2-info">
                    <div className="member2-name">박철수</div>
                    <div className="member2-school">대전중 2008</div>
                  </div>
                  <div className="member2-badge">NEW</div>
                </div>
              </div>
            </div>

            <div className="neon-panel">
              <div className="panel-header">
                <span>▶</span> TOP SCHOOLS
              </div>
              <div className="panel-content">
                <div className="rank2-item">
                  <span className="rank2-num first">01</span>
                  <span className="rank2-school">서울고등학교</span>
                  <span className="rank2-count">1.2K</span>
                </div>
                <div className="rank2-item">
                  <span className="rank2-num second">02</span>
                  <span className="rank2-school">경기중학교</span>
                  <span className="rank2-count">987</span>
                </div>
                <div className="rank2-item">
                  <span className="rank2-num third">03</span>
                  <span className="rank2-school">부산여고</span>
                  <span className="rank2-count">856</span>
                </div>
                <div className="rank2-item">
                  <span className="rank2-num">04</span>
                  <span className="rank2-school">대전초등학교</span>
                  <span className="rank2-count">734</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta2">
        <div className="cta2-box">
          <h2 className="cta2-title">지금 바로 시작하세요</h2>
          <p className="cta2-text">무료 회원가입하고 친구를 찾아보세요</p>
          <button className="btn-cta2">
            <span className="btn-text">START NOW</span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer2">
        <div className="footer2-content">
          <div className="footer2-logo">우리반</div>
          <div className="footer2-links">
            <a href="#about">About</a>
            <span>·</span>
            <a href="#terms">Terms</a>
            <span>·</span>
            <a href="#privacy">Privacy</a>
            <span>·</span>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer2-copy">
            © 2026 우리반. Connecting memories since 2000.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Hybrid_v2;
