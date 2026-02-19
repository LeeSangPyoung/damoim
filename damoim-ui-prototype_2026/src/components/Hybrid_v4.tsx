import React from 'react';
import './Hybrid_v4.css';

const Hybrid_v4: React.FC = () => {
  return (
    <div className="hybrid4-container">
      {/* Warm header */}
      <header className="hybrid4-header">
        <div className="header4-wrapper">
          <div className="brand4">
            <span className="brand4-icon">👥</span>
            <h1 className="logo4">우리반</h1>
          </div>
          <nav className="nav4">
            <a href="#search">동창찾기</a>
            <a href="#chat">채팅</a>
            <a href="#board">게시판</a>
            <button className="btn4-primary">시작하기</button>
          </nav>
        </div>
      </header>

      {/* Hero warm */}
      <section className="hero4">
        <div className="hero4-container">
          <div className="hero4-text">
            <span className="hero4-badge">✨ 추억의 재회</span>
            <h1 className="hero4-title">
              따뜻한 추억과<br />
              다시 만나는 시간
            </h1>
            <p className="hero4-desc">
              학창시절의 소중했던 친구들과 다시 연결되세요
            </p>
          </div>

          <div className="warm-card">
            <div className="card4-header">
              <h3>친구 찾기</h3>
            </div>
            <div className="card4-body">
              <div className="input4-group">
                <label>학교</label>
                <input type="text" placeholder="학교 이름" className="input4" />
              </div>
              <div className="input4-group">
                <label>졸업년도</label>
                <select className="input4">
                  <option>선택하세요</option>
                  <option>2000년</option>
                  <option>2001년</option>
                  <option>2002년</option>
                  <option>2003년</option>
                  <option>2004년</option>
                  <option>2005년</option>
                </select>
              </div>
              <button className="btn4-search">검색하기</button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats warm */}
      <section className="stats4">
        <div className="container4">
          <div className="stats4-row">
            <div className="stat4-box">
              <div className="stat4-icon">👥</div>
              <div className="stat4-num">12,345</div>
              <div className="stat4-text">회원</div>
            </div>
            <div className="stat4-box">
              <div className="stat4-icon">🏫</div>
              <div className="stat4-num">3,456</div>
              <div className="stat4-text">학교</div>
            </div>
            <div className="stat4-box">
              <div className="stat4-icon">💬</div>
              <div className="stat4-num">987</div>
              <div className="stat4-text">채팅방</div>
            </div>
            <div className="stat4-box">
              <div className="stat4-icon">❤️</div>
              <div className="stat4-num">8,901</div>
              <div className="stat4-text">재회</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features warm */}
      <section className="features4">
        <div className="container4">
          <h2 className="title4">
            <span className="title4-deco">✦</span>
            주요 기능
            <span className="title4-deco">✦</span>
          </h2>

          <div className="features4-grid">
            <div className="feature4-box">
              <div className="feature4-emoji">🔍</div>
              <h3>동창 검색</h3>
              <p>학교와 졸업년도로 친구를 쉽게 찾을 수 있어요</p>
            </div>

            <div className="feature4-box">
              <div className="feature4-emoji">💌</div>
              <h3>1:1 채팅</h3>
              <p>찾은 친구와 실시간으로 대화하세요</p>
            </div>

            <div className="feature4-box">
              <div className="feature4-emoji">👨‍👩‍👧‍👦</div>
              <h3>그룹 채팅</h3>
              <p>같은 학번 친구들과 함께 모여요</p>
            </div>

            <div className="feature4-box">
              <div className="feature4-emoji">📝</div>
              <h3>게시판</h3>
              <p>학교별 게시판에서 소식을 나눠요</p>
            </div>
          </div>
        </div>
      </section>

      {/* Activity warm */}
      <section className="activity4">
        <div className="container4">
          <div className="activity4-grid">
            <div className="warm-panel">
              <h3 className="panel4-title">
                <span className="title-icon">✨</span>
                새로 가입한 친구
              </h3>
              <div className="member4-list">
                <div className="member4-item">
                  <div className="member4-pic">김</div>
                  <div className="member4-details">
                    <div className="member4-name">김민수</div>
                    <div className="member4-school">서울고 2010</div>
                  </div>
                </div>
                <div className="member4-item">
                  <div className="member4-pic">이</div>
                  <div className="member4-details">
                    <div className="member4-name">이영희</div>
                    <div className="member4-school">부산여고 2012</div>
                  </div>
                </div>
                <div className="member4-item">
                  <div className="member4-pic">박</div>
                  <div className="member4-details">
                    <div className="member4-name">박철수</div>
                    <div className="member4-school">대전중 2008</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="warm-panel">
              <h3 className="panel4-title">
                <span className="title-icon">🔥</span>
                인기 학교
              </h3>
              <div className="school4-list">
                <div className="school4-item">
                  <span className="school4-rank top1">1</span>
                  <span className="school4-name">서울고등학교</span>
                  <span className="school4-badge">1.2K</span>
                </div>
                <div className="school4-item">
                  <span className="school4-rank top2">2</span>
                  <span className="school4-name">경기중학교</span>
                  <span className="school4-badge">987</span>
                </div>
                <div className="school4-item">
                  <span className="school4-rank top3">3</span>
                  <span className="school4-name">부산여고</span>
                  <span className="school4-badge">856</span>
                </div>
                <div className="school4-item">
                  <span className="school4-rank">4</span>
                  <span className="school4-name">대전초등학교</span>
                  <span className="school4-badge">734</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA warm */}
      <section className="cta4">
        <div className="cta4-box">
          <h2>오늘부터 시작해보세요</h2>
          <p>무료 회원가입하고 소중한 친구들을 만나보세요</p>
          <button className="btn4-cta">
            무료로 시작하기 →
          </button>
        </div>
      </section>

      {/* Footer warm */}
      <footer className="footer4">
        <div className="footer4-content">
          <div className="footer4-top">
            <div>
              <div className="footer4-logo">우리반</div>
              <p className="footer4-tagline">추억을 이어주는 따뜻한 공간</p>
            </div>
            <div className="footer4-links">
              <a href="#about">소개</a>
              <a href="#terms">이용약관</a>
              <a href="#privacy">개인정보</a>
              <a href="#contact">문의</a>
            </div>
          </div>
          <div className="footer4-bottom">
            <p>© 2026 우리반 · 모든 권리 보유</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Hybrid_v4;
