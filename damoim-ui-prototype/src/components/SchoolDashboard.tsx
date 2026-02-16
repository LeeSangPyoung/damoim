import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, ProfileResponse, SchoolInfo } from '../api/user';
import { postAPI } from '../api/post';
import { getAuthData } from '../utils/auth';
import './SchoolDashboard.css';

interface SchoolWithStats extends SchoolInfo {
  classmateCount: number;
  newPostCount: number;
}

const SCHOOL_THEME: Record<string, {
  gradient: string;
  bgLight: string;
  badgeColor: string;
  badgeBg: string;
  hoverBorder: string;
  shadowColor: string;
}> = {
  '초등학교': {
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    bgLight: '#ecfdf5',
    badgeColor: '#059669',
    badgeBg: '#d1fae5',
    hoverBorder: '#a7f3d0',
    shadowColor: 'rgba(5, 150, 105, 0.2)',
  },
  '중학교': {
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    bgLight: '#eff6ff',
    badgeColor: '#2563eb',
    badgeBg: '#dbeafe',
    hoverBorder: '#93c5fd',
    shadowColor: 'rgba(37, 99, 235, 0.2)',
  },
  '고등학교': {
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    bgLight: '#f5f3ff',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    hoverBorder: '#c4b5fd',
    shadowColor: 'rgba(124, 58, 237, 0.2)',
  },
  '대학교': {
    gradient: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    bgLight: '#fef2f2',
    badgeColor: '#dc2626',
    badgeBg: '#fee2e2',
    hoverBorder: '#fca5a5',
    shadowColor: 'rgba(220, 38, 38, 0.2)',
  },
};

function getSchoolIcon(schoolType: string) {
  switch (schoolType) {
    case '초등학교':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      );
    case '중학교':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
        </svg>
      );
    case '고등학교':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
        </svg>
      );
    case '대학교':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 20h20" />
          <path d="M5 20V8l7-5 7 5v12" />
          <rect x="9" y="12" width="6" height="8" rx="1" />
          <path d="M3 20V11l9-7 9 7v9" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 20h20" />
          <path d="M5 20V8l7-5 7 5v12" />
        </svg>
      );
  }
}

// 같은 학교+졸업년도는 하나로 그룹핑 (학년/반이 여러 개일 수 있음)
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

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    const { user } = getAuthData();
    if (!user) return;

    try {
      const profile = await userAPI.getProfile(user.userId);
      const grouped = groupSchools(profile.schools);

      // 각 학교별 통계 병렬 로드
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
      <div className="school-dashboard">
        <div className="school-dashboard-loading">
          <div className="school-dashboard-spinner" />
          <p>학교 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="school-dashboard">
      <div className="school-dashboard-header">
        <h2>내 학교</h2>
        <p>등록된 학교를 선택하여 게시판을 확인하세요</p>
      </div>

      {schools.length === 0 ? (
        <div className="school-dashboard-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" />
            <path d="M5 20V8l7-5 7 5v12" />
            <rect x="9" y="12" width="6" height="8" rx="1" />
          </svg>
          <p>등록된 학교가 없습니다.</p>
          <button onClick={() => navigate('/profile/edit')}>학교 정보 등록하기</button>
        </div>
      ) : (
        <div className="school-cards-grid">
          {schools.map((school) => {
            const theme = SCHOOL_THEME[school.schoolType] || SCHOOL_THEME['초등학교'];
            return (
              <div
                key={`${school.schoolName}-${school.graduationYear}`}
                className="school-card"
                onClick={() => handleCardClick(school)}
                style={{
                  '--card-shadow-color': theme.shadowColor,
                  '--card-hover-border': theme.hoverBorder,
                } as React.CSSProperties}
              >
                {/* 그라데이션 헤더 영역 */}
                <div className="school-card-gradient" style={{ background: theme.gradient }}>
                  <div className="school-card-gradient-pattern" />
                  <div className="school-card-icon">
                    {getSchoolIcon(school.schoolType)}
                  </div>
                  <span className="school-card-type-badge">{school.schoolType}</span>
                  {school.newPostCount > 0 && (
                    <div className="school-card-new-badge">
                      새글 {school.newPostCount}
                    </div>
                  )}
                </div>

                {/* 카드 본문 */}
                <div className="school-card-body">
                  <h3 className="school-card-name">{school.schoolName}</h3>
                  <p className="school-card-info">
                    {school.graduationYear}년 졸업
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

                  {/* 통계 */}
                  <div className="school-card-stats">
                    <div
                      className="school-card-stat school-card-stat-clickable"
                      style={{ background: theme.bgLight, borderColor: theme.hoverBorder }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/classmates?schoolCode=${encodeURIComponent(school.schoolCode || '')}&schoolName=${encodeURIComponent(school.schoolName)}&year=${encodeURIComponent(school.graduationYear)}&type=${encodeURIComponent(school.schoolType)}`);
                      }}
                    >
                      <div className="school-card-stat-icon" style={{ background: theme.badgeBg }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.badgeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div className="school-card-stat-text">
                        <span className="school-card-stat-value" style={{ color: theme.badgeColor }}>{school.classmateCount}</span>
                        <span className="school-card-stat-label">동창</span>
                      </div>
                    </div>
                    <div className="school-card-stat" style={{ background: theme.bgLight, borderColor: theme.hoverBorder }}>
                      <div className="school-card-stat-icon" style={{ background: theme.badgeBg }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.badgeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                      <div className="school-card-stat-text">
                        <span className="school-card-stat-value" style={{ color: theme.badgeColor }}>{school.newPostCount}</span>
                        <span className="school-card-stat-label">새 글</span>
                      </div>
                    </div>
                  </div>

                  {/* 게시판 가기 버튼 */}
                  <div className="school-card-enter" style={{ background: theme.bgLight, color: theme.badgeColor }}>
                    게시판 가기
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
