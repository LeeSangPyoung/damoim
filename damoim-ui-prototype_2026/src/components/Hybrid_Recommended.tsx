import React from 'react';
import './Hybrid_Recommended.css';

const Hybrid_Recommended: React.FC = () => {
  return (
    <div className="hybrid-container">
      {/* Retro-inspired header with modern execution */}
      <header className="hybrid-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="retro-logo">우리반</h1>
            <span className="retro-badge">Since 2000</span>
          </div>
          <nav className="modern-nav">
            <a href="#search">동창찾기</a>
            <a href="#chat">채팅</a>
            <a href="#board">게시판</a>
            <button className="btn-outlined">로그인</button>
            <button className="btn-retro-primary">회원가입</button>
          </nav>
        </div>
      </header>

      {/* Hero with retro vibe but modern layout */}
      <section className="hero">
        <div className="hero-bg-pattern"></div>
        <div className="hero-container">
          <div className="hero-text">
            <div className="retro-label">✨ 추억을 되살리는 공간</div>
            <h1 className="hero-title">
              그 시절 친구들,<br />
              지금 다시 만나보세요
            </h1>
            <p className="hero-desc">
              초등학교부터 대학교까지, 함께했던 소중한 친구들을 찾아<br />
              추억을 나누고 새로운 이야기를 만들어가세요
            </p>
          </div>

          {/* Retro-styled search card */}
          <div className="retro-card search-card">
            <div className="card-header">
              <span className="header-icon">🔍</span>
              <h3>동창 검색</h3>
            </div>
            <div className="card-body">
              <div className="input-group">
                <label>학교명</label>
                <input
                  type="text"
                  placeholder="예) 서울고등학교"
                  className="hybrid-input"
                />
              </div>
              <div className="input-group">
                <label>졸업년도</label>
                <select className="hybrid-input">
                  <option>선택하세요</option>
                  <option>2000년</option>
                  <option>2001년</option>
                  <option>2002년</option>
                  <option>2003년</option>
                  <option>2004년</option>
                  <option>2005년</option>
                </select>
              </div>
              <button className="btn-retro-search">
                <span>🔍</span> 검색하기
              </button>

              <div className="quick-links">
                <span>빠른 검색:</span>
                <a href="#초등">초등</a>
                <a href="#중등">중등</a>
                <a href="#고등">고등</a>
                <a href="#대학">대학</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats with retro counter style */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-icon">👥</div>
              <div className="stat-counter">12,345</div>
              <div className="stat-text">가입 회원</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">🏫</div>
              <div className="stat-counter">3,456</div>
              <div className="stat-text">등록 학교</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">💬</div>
              <div className="stat-counter">987</div>
              <div className="stat-text">활성 채팅방</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon">❤️</div>
              <div className="stat-counter">8,901</div>
              <div className="stat-text">재회 성공</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features with nostalgic design */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">
            <span className="title-deco">━━━</span>
            주요 기능
            <span className="title-deco">━━━</span>
          </h2>

          <div className="features-grid">
            <div className="feature-box">
              <div className="feature-top">
                <div className="feature-number">01</div>
                <div className="feature-icon-large">🎓</div>
              </div>
              <h3>동창 찾기</h3>
              <p>학교와 졸업년도로 간편하게 옛 친구들을 찾을 수 있습니다</p>
            </div>

            <div className="feature-box">
              <div className="feature-top">
                <div className="feature-number">02</div>
                <div className="feature-icon-large">💌</div>
              </div>
              <h3>1:1 채팅 & 쪽지</h3>
              <p>실시간 채팅과 옛날 감성의 쪽지로 소통할 수 있습니다</p>
            </div>

            <div className="feature-box">
              <div className="feature-top">
                <div className="feature-number">03</div>
                <div className="feature-icon-large">👨‍👩‍👧‍👦</div>
              </div>
              <h3>그룹 오픈채팅</h3>
              <p>같은 학번끼리 모여 추억을 나누는 채팅방을 만들어보세요</p>
            </div>

            <div className="feature-box">
              <div className="feature-top">
                <div className="feature-number">04</div>
                <div className="feature-icon-large">📋</div>
              </div>
              <h3>학교 게시판</h3>
              <p>학교별, 학번별 게시판에서 소식을 공유하고 교류하세요</p>
            </div>
          </div>
        </div>
      </section>

      {/* Activity with modern card + retro elements */}
      <section className="activity-section">
        <div className="container">
          <h2 className="section-title">
            <span className="title-deco">━━━</span>
            최근 활동
            <span className="title-deco">━━━</span>
          </h2>

          <div className="activity-grid">
            <div className="retro-card">
              <div className="card-header">
                <span className="header-icon">👥</span>
                <h3>새로 가입한 회원</h3>
              </div>
              <div className="card-body">
                <div className="member-item">
                  <div className="member-avatar">김</div>
                  <div className="member-info">
                    <div className="member-name">김민수</div>
                    <div className="member-school">서울고등학교 2010년</div>
                  </div>
                  <div className="member-time">5분 전</div>
                </div>
                <div className="member-item">
                  <div className="member-avatar">이</div>
                  <div className="member-info">
                    <div className="member-name">이영희</div>
                    <div className="member-school">부산여고 2012년</div>
                  </div>
                  <div className="member-time">1시간 전</div>
                </div>
                <div className="member-item">
                  <div className="member-avatar">박</div>
                  <div className="member-info">
                    <div className="member-name">박철수</div>
                    <div className="member-school">대전중 2008년</div>
                  </div>
                  <div className="member-time">3시간 전</div>
                </div>
              </div>
            </div>

            <div className="retro-card">
              <div className="card-header">
                <span className="header-icon">🔥</span>
                <h3>인기 학교 TOP 5</h3>
              </div>
              <div className="card-body">
                <div className="ranking-item">
                  <span className="rank gold">1</span>
                  <span className="school">서울고등학교</span>
                  <span className="count">1,234명</span>
                </div>
                <div className="ranking-item">
                  <span className="rank silver">2</span>
                  <span className="school">경기중학교</span>
                  <span className="count">987명</span>
                </div>
                <div className="ranking-item">
                  <span className="rank bronze">3</span>
                  <span className="school">부산여자고등학교</span>
                  <span className="count">856명</span>
                </div>
                <div className="ranking-item">
                  <span className="rank">4</span>
                  <span className="school">대전초등학교</span>
                  <span className="count">734명</span>
                </div>
                <div className="ranking-item">
                  <span className="rank">5</span>
                  <span className="school">광주중학교</span>
                  <span className="count">652명</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Retro-style CTA */}
      <section className="cta-section">
        <div className="cta-box">
          <h2>지금 바로 시작하세요!</h2>
          <p>무료로 가입하고 소중한 친구들을 만나보세요</p>
          <button className="btn-cta-large">
            ✨ 회원가입하고 친구 찾기 ✨
          </button>
          <div className="cta-note">※ 회원가입은 무료이며 1분이면 완료됩니다</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hybrid-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo">우리반</div>
            <p>추억을 이어주는 플랫폼</p>
          </div>
          <div className="footer-section">
            <h4>서비스</h4>
            <a href="#about">서비스 소개</a>
            <a href="#features">기능 안내</a>
            <a href="#pricing">요금제</a>
          </div>
          <div className="footer-section">
            <h4>정책</h4>
            <a href="#terms">이용약관</a>
            <a href="#privacy">개인정보처리방침</a>
            <a href="#rules">운영정책</a>
          </div>
          <div className="footer-section">
            <h4>고객지원</h4>
            <a href="#faq">자주 묻는 질문</a>
            <a href="#contact">문의하기</a>
            <a href="#report">신고하기</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 우리반. All rights reserved. | Made with ❤️ for reconnecting old friends</p>
        </div>
      </footer>
    </div>
  );
};

export default Hybrid_Recommended;
