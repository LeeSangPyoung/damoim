import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Search.css';
import { getAuthData } from '../utils/auth';
import { userAPI, ClassmateInfo } from '../api/user';

const Search = () => {
  const navigate = useNavigate();
  const [searchName, setSearchName] = useState('');
  const [searchSchool, setSearchSchool] = useState('');
  const [results, setResults] = useState<ClassmateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const { user } = getAuthData();
    if (!user) return;

    setLoading(true);
    setSearched(true);
    try {
      const response = await userAPI.searchUsers({
        currentUserId: user.userId,
        name: searchName || undefined,
        schoolName: searchSchool || undefined,
      });
      setResults(response.classmates);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchName('');
    setSearchSchool('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="search-notion">
      {/* 헤더 */}
      <header className="search-header">
        <div className="search-header-main">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← 돌아가기
          </button>
          <h1 className="search-title">친구 찾기</h1>
          <div className="placeholder"></div>
        </div>
      </header>

      {/* 메인 */}
      <main className="search-content">
        {/* 검색 폼 */}
        <div className="search-form">
          <div className="input-group">
            <label>이름</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>

          <div className="input-group">
            <label>학교</label>
            <input
              type="text"
              value={searchSchool}
              onChange={(e) => setSearchSchool(e.target.value)}
              placeholder="학교 이름을 입력하세요"
            />
          </div>

          <div className="search-actions">
            <button className="btn-secondary" onClick={handleReset}>
              초기화
            </button>
            <button className="btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>

        {/* 결과 */}
        {searched && (
          <div className="search-results">
            {results.length === 0 ? (
              <div className="results-empty">
                <p>검색 결과가 없습니다</p>
              </div>
            ) : (
              <>
                <p className="results-count">{results.length}명 찾음</p>
                <div className="results-list">
                  {results.map((person) => (
                    <div key={person.userId} className="person-item">
                      <div className="person-info">
                        <h3>{person.name}</h3>
                        <p>
                          {person.school?.schoolName} · {person.school?.graduationYear}년 졸업
                          {person.school?.grade && ` · ${person.school?.grade}학년`}
                          {person.school?.classNumber && ` ${person.school?.classNumber}반`}
                        </p>
                      </div>
                      <button 
                        className="btn-message"
                        onClick={() => navigate(`/messages`)}
                      >
                        쪽지
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
