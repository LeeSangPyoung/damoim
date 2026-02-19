import React from 'react';
import './Hybrid_v3.css';

const Hybrid_v3: React.FC = () => {
  return (
    <div className="hybrid3-container">
      {/* Dark elegant header */}
      <header className="hybrid3-header">
        <div className="header3-wrapper">
          <div className="brand3">
            <h1 className="logo3">우리반</h1>
            <span className="subtitle3">Memories Reconnected</span>
          </div>
          <nav className="nav3">
            <a href="#search" className="nav3-link">동창찾기</a>
            <a href="#chat" className="nav3-link">채팅</a>
            <a href="#board" className="nav3-link">게시판</a>
            <button className="btn3-login">로그인</button>
          </nav>
        </div>
      </header>

      {/* Hero dark */}
      <section className="hero3">
        <div className="hero3-bg"></div>
        <div className="hero3-content">
          <div className="hero3-label">Since 2000</div>
          <h1 className="hero3-title">
            잊지 못할 추억,<br />
            다시 만나는 순간
          </h1>
          <p className="hero3-subtitle">
            세월이 흘러도 변하지 않는 우정을 되살려보세요
          </p>

          {/* Dark search card */}
          <div className="search3-card">
            <div className="search3-body">
              <input
                type="text"
                placeholder="학교 이름을 입력하세요"
                className="input3"
              />
              <select className="input3">
                <option>졸업년도를 선택하세요</option>
                <option>2000년</option>
                <option>2001년</option>
                <option>2002년</option>
                <option>2003년</option>
                <option>2004년</option>
                <option>2005년</option>
              </select>
              <button className="btn3-search">
                검색하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats elegant */}
      <section className="stats3">
        <div className="container3">
          <div className="stats3-grid">
            <div className="stat3-item">
              <div className="stat3-value">12,345</div>
              <div className="stat3-label">총 회원수</div>
              <div className="stat3-bar"></div>
            </div>
            <div className="stat3-item">
              <div className="stat3-value">3,456</div>
              <div className="stat3-label">등록 학교</div>
              <div className="stat3-bar"></div>
            </div>
            <div className="stat3-item">
              <div className="stat3-value">987</div>
              <div className="stat3-label">활성 채팅방</div>
              <div className="stat3-bar"></div>
            </div>
            <div className="stat3-item">
              <div className="stat3-value">8,901</div>
              <div className="stat3-label">재회 성공</div>
              <div className="stat3-bar"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features dark elegant */}
      <section className="features3">
        <div className="container3">
          <h2 className="title3">주요 기능</h2>

          <div className="features3-grid">
            <div className="feature3-card">
              <div className="feature3-icon">🔍</div>
              <h3>동창 검색</h3>
              <p>학교와 졸업년도로 간편하게 친구를 찾을 수 있습니다</p>
              <div className="feature3-line"></div>
            </div>

            <div className="feature3-card">
              <div className="feature3-icon">💬</div>
              <h3>실시간 채팅</h3>
              <p>찾은 친구와 바로 대화를 시작하세요</p>
              <div className="feature3-line"></div>
            </div>

            <div className="feature3-card">
              <div className="feature3-icon">👥</div>
              <h3>그룹 오픈채팅</h3>
              <p>같은 학번끼리 모여 추억을 나눠보세요</p>
              <div className="feature3-line"></div>
            </div>

            <div className="feature3-card">
              <div className="feature3-icon">📋</div>
              <h3>학교 게시판</h3>
              <p>학교별 게시판에서 소식을 공유하세요</p>
              <div className="feature3-line"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Activity elegant */}
      <section className="activity3">
        <div className="container3">
          <div className="activity3-grid">
            <div className="panel3">
              <h3 className="panel3-title">최근 가입자</h3>
              <div className="member3-list">
                <div className="member3-item">
                  <div className="member3-avatar">K</div>
                  <div className="member3-info">
                    <div className="member3-name">김민수</div>
                    <div className="member3-school">서울고등학교 · 2010년 졸업</div>
                  </div>
                  <div className="member3-time">5분 전</div>
                </div>
                <div className="member3-item">
                  <div className="member3-avatar">L</div>
                  <div className="member3-info">
                    <div className="member3-name">이영희</div>
                    <div className="member3-school">부산여자고등학교 · 2012년 졸업</div>
                  </div>
                  <div className="member3-time">1시간 전</div>
                </div>
                <div className="member3-item">
                  <div className="member3-avatar">P</div>
                  <div className="member3-info">
                    <div className="member3-name">박철수</div>
                    <div className="member3-school">대전중학교 · 2008년 졸업</div>
                  </div>
                  <div className="member3-time">3시간 전</div>
                </div>
              </div>
            </div>

            <div className="panel3">
              <h3 className="panel3-title">인기 학교</h3>
              <div className="school3-list">
                <div className="school3-item">
                  <span className="school3-rank">1</span>
                  <span className="school3-name">서울고등학교</span>
                  <span className="school3-count">1,234명</span>
                </div>
                <div className="school3-item">
                  <span className="school3-rank">2</span>
                  <span className="school3-name">경기중학교</span>
                  <span className="school3-count">987명</span>
                </div>
                <div className="school3-item">
                  <span className="school3-rank">3</span>
                  <span className="school3-name">부산여자고등학교</span>
                  <span className="school3-count">856명</span>
                </div>
                <div className="school3-item">
                  <span className="school3-rank">4</span>
                  <span className="school3-name">대전초등학교</span>
                  <span className="school3-count">734명</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA elegant */}
      <section className="cta3">
        <div className="cta3-content">
          <h2>지금 시작하세요</h2>
          <p>무료로 가입하고 소중한 친구들을 만나보세요</p>
          <button className="btn3-cta">
            무료 회원가입
          </button>
        </div>
      </section>

      {/* Footer dark */}
      <footer className="footer3">
        <div className="footer3-content">
          <div className="footer3-main">
            <div className="footer3-brand">
              <div className="footer3-logo">우리반</div>
              <p>추억을 이어주는 플랫폼</p>
            </div>
            <div className="footer3-links">
              <div className="footer3-col">
                <h4>서비스</h4>
                <a href="#about">서비스 소개</a>
                <a href="#features">기능</a>
              </div>
              <div className="footer3-col">
                <h4>정책</h4>
                <a href="#terms">이용약관</a>
                <a href="#privacy">개인정보처리방침</a>
              </div>
              <div className="footer3-col">
                <h4>고객지원</h4>
                <a href="#faq">FAQ</a>
                <a href="#contact">문의</a>
              </div>
            </div>
          </div>
          <div className="footer3-bottom">
            <p>© 2026 우리반. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Hybrid_v3;
