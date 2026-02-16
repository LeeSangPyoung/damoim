import React from 'react';
import './Modern_v1.css';

const Modern_v1: React.FC = () => {
  return (
    <div className="modern-v1-container">
      {/* Clean modern header */}
      <header className="modern-header">
        <nav className="nav-container">
          <div className="logo">우리반</div>
          <div className="nav-links">
            <a href="#search">동창찾기</a>
            <a href="#board">게시판</a>
            <a href="#about">소개</a>
            <button className="btn-login">로그인</button>
          </div>
        </nav>
      </header>

      {/* Hero section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">추억 속 친구를 찾아보세요</h1>
          <p className="hero-subtitle">
            학창시절 함께했던 소중한 인연,<br />
            다시 만날 수 있습니다
          </p>

          {/* Modern search box */}
          <div className="search-card">
            <div className="search-row">
              <input
                type="text"
                placeholder="학교 이름을 입력하세요"
                className="modern-input"
              />
              <select className="modern-select">
                <option>졸업년도</option>
                <option>2000년</option>
                <option>2001년</option>
                <option>2002년</option>
                <option>2003년</option>
                <option>2004년</option>
                <option>2005년</option>
              </select>
              <button className="btn-search">검색</button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat">
              <div className="stat-value">12,345</div>
              <div className="stat-label">가입 회원</div>
            </div>
            <div className="stat">
              <div className="stat-value">3,456</div>
              <div className="stat-label">등록 학교</div>
            </div>
            <div className="stat">
              <div className="stat-value">8,901</div>
              <div className="stat-label">이번 달 재회</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">주요 기능</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>동창 찾기</h3>
              <p>학교와 졸업년도로 쉽게 친구를 찾을 수 있습니다</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>실시간 채팅</h3>
              <p>찾은 친구와 바로 대화를 시작하세요</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>그룹 채팅</h3>
              <p>같은 학번끼리 모여 추억을 나눌 수 있습니다</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>게시판</h3>
              <p>학교별 게시판에서 소식을 공유하세요</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="activity-section">
        <div className="container">
          <div className="activity-grid">
            <div className="activity-card">
              <h3>최근 가입자</h3>
              <ul className="activity-list">
                <li>
                  <div className="activity-item">
                    <div className="avatar">김</div>
                    <div className="activity-info">
                      <div className="name">김민수</div>
                      <div className="school">서울고등학교 2010년 졸업</div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="activity-item">
                    <div className="avatar">이</div>
                    <div className="activity-info">
                      <div className="name">이영희</div>
                      <div className="school">부산여자고등학교 2012년 졸업</div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="activity-item">
                    <div className="avatar">박</div>
                    <div className="activity-info">
                      <div className="name">박철수</div>
                      <div className="school">대전중학교 2008년 졸업</div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="activity-card">
              <h3>인기 학교</h3>
              <ul className="school-ranking">
                <li>
                  <span className="rank-number">1</span>
                  <span className="school-name">서울고등학교</span>
                  <span className="member-count">1,234명</span>
                </li>
                <li>
                  <span className="rank-number">2</span>
                  <span className="school-name">경기중학교</span>
                  <span className="member-count">987명</span>
                </li>
                <li>
                  <span className="rank-number">3</span>
                  <span className="school-name">부산여자고등학교</span>
                  <span className="member-count">856명</span>
                </li>
                <li>
                  <span className="rank-number">4</span>
                  <span className="school-name">대전초등학교</span>
                  <span className="member-count">734명</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>지금 바로 시작하세요</h2>
          <p>무료로 가입하고 오래된 친구를 만나보세요</p>
          <button className="btn-cta">회원가입하기</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="modern-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">우리반</div>
            <p>추억을 이어주는 플랫폼</p>
          </div>
          <div className="footer-links">
            <a href="#about">서비스 소개</a>
            <a href="#terms">이용약관</a>
            <a href="#privacy">개인정보처리방침</a>
            <a href="#contact">문의하기</a>
          </div>
          <div className="footer-copyright">
            © 2026 우리반. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Modern_v1;
