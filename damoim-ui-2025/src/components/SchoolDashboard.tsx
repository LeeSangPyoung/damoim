import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, SchoolInfo } from '../api/user';
import { postAPI } from '../api/post';
import { getAuthData } from '../utils/auth';
import './SchoolDashboard.css';

interface SchoolWithStats extends SchoolInfo {
  classmateCount: number;
  newPostCount: number;
}

function groupSchools(schools: SchoolInfo[]): (SchoolInfo & { gradeClasses: { grade?: string; classNumber?: string }[] })[] {
  const map = new Map<string, SchoolInfo & { gradeClasses: { grade?: string; classNumber?: string }[] }>();

  for (const s of schools) {
    const key = `${s.schoolType}|${s.schoolName}|${s.graduationYear}`;
    if (map.has(key)) {
      const existing = map.get(key)!;
      if (s.grade || s.classNumber) {
        existing.gradeClasses.push({ grade: s.grade, classNumber: s.classNumber });
      }
    } else {
      const gradeClasses: { grade?: string; classNumber?: string }[] = [];
      if (s.grade || s.classNumber) {
        gradeClasses.push({ grade: s.grade, classNumber: s.classNumber });
      }
      map.set(key, { ...s, gradeClasses });
    }
  }

  return Array.from(map.values());
}

export default function SchoolDashboard() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<(SchoolWithStats & { gradeClasses: { grade?: string; classNumber?: string }[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    const { user } = getAuthData();
    if (!user) return;

    setUserName(user.name || '');

    try {
      const profile = await userAPI.getProfile(user.userId);
      const grouped = groupSchools(profile.schools);

      const schoolsWithStats = await Promise.all(
        grouped.map(async (school) => {
          try {
            const [classmatesData, newPostCount] = await Promise.all([
              school.schoolCode
                ? userAPI.searchClassmates(user.userId, school.schoolCode, school.graduationYear)
                : Promise.resolve({ classmates: [], totalCount: 0 }),
              postAPI.getNewPostCountForSchool(user.userId, school.schoolName, school.graduationYear),
            ]);
            return {
              ...school,
              classmateCount: classmatesData.totalCount,
              newPostCount,
            };
          } catch {
            return { ...school, classmateCount: 0, newPostCount: 0 };
          }
        })
      );

      setSchools(schoolsWithStats);
    } catch (error) {
      console.error('학교 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (school: SchoolWithStats) => {
    navigate(`/board?school=${encodeURIComponent(school.schoolName)}&year=${encodeURIComponent(school.graduationYear)}&code=${encodeURIComponent(school.schoolCode || '')}`);
  };

  if (loading) {
    return (
      <div className="dashboard-clean">
        <header className="clean-header">
          <div className="clean-brand">우리반</div>
        </header>
        <div className="clean-loading">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-clean">
      {/* 헤더 */}
      <header className="clean-header">
        <div className="clean-brand">우리반</div>
        <nav className="clean-nav">
          <button onClick={() => navigate('/search')}>검색</button>
          <button onClick={() => navigate('/messages')}>메시지</button>
          <button onClick={() => navigate('/chat')}>채팅</button>
          <button onClick={() => navigate('/profile')}>프로필</button>
        </nav>
      </header>

      {/* 메인 */}
      <main className="clean-main">
        <div className="clean-title">
          <h1>{userName ? `${userName}님의 학교` : '내 학교'}</h1>
        </div>

        {schools.length === 0 ? (
          <div className="clean-empty">
            <p>등록된 학교가 없습니다</p>
            <button onClick={() => navigate('/profile/edit')}>학교 정보 등록하기</button>
          </div>
        ) : (
          <div className="clean-list">
            {schools.map((school) => (
              <div
                key={`${school.schoolName}-${school.graduationYear}`}
                className="clean-item"
                onClick={() => handleCardClick(school)}
              >
                <div className="item-info">
                  <h3>{school.schoolName}</h3>
                  <p>
                    {school.schoolType} · {school.graduationYear}년 졸업
                    {school.gradeClasses.length > 0 && (
                      <>
                        {' · '}
                        {school.gradeClasses.map((gc, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            {gc.grade && `${gc.grade}학년`}
                            {gc.classNumber && ` ${gc.classNumber}반`}
                          </span>
                        ))}
                      </>
                    )}
                  </p>
                </div>
                <div className="item-stats">
                  <span className="stat">{school.classmateCount} 동창</span>
                  {school.newPostCount > 0 && (
                    <span className="stat new">{school.newPostCount} 새 글</span>
                  )}
                </div>
                <span className="item-arrow">→</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
