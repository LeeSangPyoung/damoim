import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';
import { authAPI } from '../api/auth';
import { schoolAPI, SchoolSearchResult } from '../api/school';
import { saveAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';

interface GradeClass {
  id: number;
  grade: string;
  classNumber: string;
}

interface School {
  id: number;
  schoolType: string;
  schoolName: string;
  schoolCode: string;
  graduationYear: string;
  gradeClasses: GradeClass[];
  graduationYearFrom: number | null;
  region: string;
}

const SCHOOL_TYPE_MAP: Record<string, string> = {
  '초등학교': '초등학교',
  '중학교': '중학교',
  '고등학교': '고등학교',
  '대학교': '대학교',
};

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void } | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: '',
  });

  const [schools, setSchools] = useState<School[]>([
    {
      id: 1,
      schoolType: '',
      schoolName: '',
      schoolCode: '',
      graduationYear: '',
      gradeClasses: [{ id: 1, grade: '', classNumber: '' }],
      graduationYearFrom: null,
      region: '',
    }
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSchoolChange = (id: number, field: keyof School, value: string) => {
    setSchools(schools.map(school => {
      if (school.id !== id) return school;
      const updated = { ...school, [field]: value };
      // 학교 유형이 바뀌면 학교명 초기화
      if (field === 'schoolType') {
        updated.schoolName = '';
        updated.schoolCode = '';
        updated.graduationYearFrom = null;
        updated.region = '';
      }
      return updated;
    }));
  };

  const handleSchoolSelect = (id: number, result: SchoolSearchResult) => {
    setSchools(schools.map(school => {
      if (school.id !== id) return school;
      return {
        ...school,
        schoolName: result.schoolName,
        schoolCode: result.schoolCode,
        graduationYearFrom: result.graduationYearFrom,
        region: result.region || '',
      };
    }));
  };

  const addSchool = () => {
    const newId = Math.max(...schools.map(s => s.id)) + 1;
    setSchools([...schools, {
      id: newId,
      schoolType: '',
      schoolName: '',
      schoolCode: '',
      graduationYear: '',
      gradeClasses: [{ id: 1, grade: '', classNumber: '' }],
      graduationYearFrom: null,
      region: '',
    }]);
  };

  const addGradeClass = (schoolId: number) => {
    setSchools(schools.map(school => {
      if (school.id !== schoolId) return school;
      const newId = Math.max(...school.gradeClasses.map(gc => gc.id)) + 1;
      return {
        ...school,
        gradeClasses: [...school.gradeClasses, { id: newId, grade: '', classNumber: '' }],
      };
    }));
  };

  const removeGradeClass = (schoolId: number, gcId: number) => {
    setSchools(schools.map(school => {
      if (school.id !== schoolId) return school;
      if (school.gradeClasses.length <= 1) return school;
      return {
        ...school,
        gradeClasses: school.gradeClasses.filter(gc => gc.id !== gcId),
      };
    }));
  };

  const handleGradeClassChange = (schoolId: number, gcId: number, field: 'grade' | 'classNumber', value: string) => {
    setSchools(schools.map(school => {
      if (school.id !== schoolId) return school;
      return {
        ...school,
        gradeClasses: school.gradeClasses.map(gc =>
          gc.id === gcId ? { ...gc, [field]: value } : gc
        ),
      };
    }));
  };

  const removeSchool = (id: number) => {
    if (schools.length > 1) {
      setSchools(schools.filter(school => school.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      setModal({ type: 'error', message: '비밀번호가 일치하지 않습니다.', onConfirm: () => setModal(null) });
      return;
    }

    if (!formData.userId || !formData.password || !formData.name || !formData.email) {
      setModal({ type: 'error', message: '기본 정보를 모두 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    const validSchools = schools.filter(s => s.schoolType && s.schoolName && s.graduationYear);
    if (validSchools.length === 0) {
      setModal({ type: 'error', message: '최소 1개 이상의 학교 정보를 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    // 학년/반 조합을 각각 별도의 school 항목으로 펼침
    const flattenedSchools: { schoolCode?: string; schoolType: string; schoolName: string; graduationYear: string; grade?: string; classNumber?: string }[] = [];
    for (const school of validSchools) {
      const validGCs = school.gradeClasses.filter(gc => gc.grade || gc.classNumber);
      if (validGCs.length === 0) {
        flattenedSchools.push({
          schoolCode: school.schoolCode || undefined,
          schoolType: school.schoolType,
          schoolName: school.schoolName,
          graduationYear: school.graduationYear,
        });
      } else {
        for (const gc of validGCs) {
          flattenedSchools.push({
            schoolCode: school.schoolCode || undefined,
            schoolType: school.schoolType,
            schoolName: school.schoolName,
            graduationYear: school.graduationYear,
            grade: gc.grade || undefined,
            classNumber: gc.classNumber || undefined,
          });
        }
      }
    }

    try {
      const response = await authAPI.signup({
        userId: formData.userId,
        password: formData.password,
        name: formData.name,
        email: formData.email,
        schools: flattenedSchools,
      });

      saveAuthData(response);
      setModal({ type: 'success', message: '회원가입이 완료되었습니다!', onConfirm: () => { setModal(null); navigate('/dashboard'); } });
    } catch (error: any) {
      console.error('회원가입 실패:', error);
      const errorMessage = error.response?.data || '회원가입에 실패했습니다.';
      setModal({ type: 'error', message: errorMessage, onConfirm: () => setModal(null) });
    }
  };

  // 졸업년도 옵션 생성
  const getGraduationYears = (school: School) => {
    const currentYear = new Date().getFullYear();
    const fromYear = school.graduationYearFrom || (currentYear - 59);
    const years: number[] = [];
    for (let y = currentYear; y >= fromYear; y--) {
      years.push(y);
    }
    return years;
  };

  // 학년 옵션 (학교 유형에 따라)
  const getGradeOptions = (schoolType: string) => {
    switch (schoolType) {
      case '초등학교': return [1, 2, 3, 4, 5, 6];
      case '중학교':
      case '고등학교': return [1, 2, 3];
      case '대학교': return [1, 2, 3, 4, 5, 6];
      default: return [1, 2, 3, 4, 5, 6];
    }
  };

  return (
    <>
    {modal && (
      <ConfirmationModal
        type={modal.type}
        message={modal.message}
        onConfirm={modal.onConfirm}
      />
    )}
    <div className="signup-container">
      {/* Header */}
      <header className="signup-header">
        <div className="signup-header-wrapper">
          <div className="signup-brand" onClick={() => navigate('/')}>
            <span className="signup-brand-icon">
              <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="signupLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#32373c"/><stop offset="1" stopColor="#1a1d20"/></linearGradient></defs>
                <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#signupLogoGrad)"/>
                <circle cx="38" cy="32" r="10" fill="white"/><path d="M24 58c0-8 6.3-14 14-14s14 6 14 14" fill="white"/>
                <circle cx="62" cy="32" r="10" fill="white" opacity="0.85"/><path d="M48 58c0-8 6.3-14 14-14s14 6 14 14" fill="white" opacity="0.85"/>
                <rect x="20" y="66" width="60" height="4" rx="2" fill="white" opacity="0.9"/><rect x="28" y="76" width="44" height="4" rx="2" fill="white" opacity="0.6"/>
              </svg>
            </span>
            <h1 className="signup-logo">우리반</h1>
          </div>
          <nav className="signup-nav">
            <a href="#about">서비스 소개</a>
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>로그인</a>
          </nav>
        </div>
      </header>

      {/* Signup Form */}
      <section className="signup-main">
        <div className="signup-form-container">
          <div className="signup-form-header">
            <h2>회원가입</h2>
            <p>우리반과 함께 소중한 친구들을 다시 만나보세요</p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            {/* 기본 정보 */}
            <div className="signup-section">
              <h3 className="section-title">기본 정보</h3>

              <div className="signup-input-group">
                <label>아이디 <span className="required">*</span></label>
                <input
                  type="text"
                  name="userId"
                  placeholder="아이디를 입력하세요"
                  className="signup-input"
                  value={formData.userId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="signup-input-group">
                <label>비밀번호 <span className="required">*</span></label>
                <input
                  type="password"
                  name="password"
                  placeholder="비밀번호를 입력하세요"
                  className="signup-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="signup-input-group">
                <label>비밀번호 확인 <span className="required">*</span></label>
                <input
                  type="password"
                  name="passwordConfirm"
                  placeholder="비밀번호를 다시 입력하세요"
                  className="signup-input"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="signup-input-group">
                <label>이름 <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  placeholder="이름을 입력하세요"
                  className="signup-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="signup-input-group">
                <label>이메일 <span className="required">*</span></label>
                <input
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  className="signup-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* 학교 정보 */}
            <div className="signup-section">
              <div className="section-title-row">
                <h3 className="section-title">학교 정보</h3>
                <span className="section-desc">초/중/고/대 여러 학교를 추가할 수 있어요</span>
              </div>

              {schools.map((school, index) => (
                <div key={school.id} className="school-card">
                  <div className="school-card-header">
                    <span className="school-number">{index + 1}번째 학교</span>
                    {schools.length > 1 && (
                      <button
                        type="button"
                        className="school-remove-btn"
                        onClick={() => removeSchool(school.id)}
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  <div className="school-card-body">
                    <div className="signup-input-group">
                      <label>학교 유형 <span className="required">*</span></label>
                      <select
                        className="signup-input"
                        value={school.schoolType}
                        onChange={(e) => handleSchoolChange(school.id, 'schoolType', e.target.value)}
                        required
                      >
                        <option value="">선택하세요</option>
                        <option value="초등학교">초등학교</option>
                        <option value="중학교">중학교</option>
                        <option value="고등학교">고등학교</option>
                        <option value="대학교">대학교</option>
                      </select>
                    </div>

                    <div className="signup-input-group">
                      <label>학교명 <span className="required">*</span></label>
                      <SchoolAutocomplete
                        schoolType={school.schoolType}
                        value={school.schoolName}
                        onSelect={(result) => handleSchoolSelect(school.id, result)}
                        onChange={(value) => handleSchoolChange(school.id, 'schoolName', value)}
                        disabled={!school.schoolType || school.schoolType === '대학교'}
                      />
                      {school.schoolType === '대학교' && (
                        <input
                          type="text"
                          placeholder="대학교명을 입력하세요 (예: 서울대학교)"
                          className="signup-input"
                          style={{ marginTop: 8 }}
                          value={school.schoolName}
                          onChange={(e) => handleSchoolChange(school.id, 'schoolName', e.target.value)}
                          required
                        />
                      )}
                      {school.region && (
                        <span className="school-region-tag">{school.region}</span>
                      )}
                    </div>

                    <div className="signup-input-group">
                      <label>졸업년도 <span className="required">*</span></label>
                      <select
                        className="signup-input"
                        value={school.graduationYear}
                        onChange={(e) => handleSchoolChange(school.id, 'graduationYear', e.target.value)}
                        required
                      >
                        <option value="">선택</option>
                        {getGraduationYears(school).map(year => (
                          <option key={year} value={year}>{year}년</option>
                        ))}
                      </select>
                    </div>

                    <div className="grade-class-section">
                      <div className="grade-class-label-row">
                        <span className="grade-class-label">학년</span>
                        <span className="grade-class-label">반</span>
                      </div>
                      {school.gradeClasses.map((gc) => (
                        <div key={gc.id} className={`grade-class-row ${school.gradeClasses.length > 1 ? 'has-remove' : ''}`}>
                          <select
                            className="signup-input"
                            value={gc.grade}
                            onChange={(e) => handleGradeClassChange(school.id, gc.id, 'grade', e.target.value)}
                          >
                            <option value="">선택</option>
                            {getGradeOptions(school.schoolType).map(g => (
                              <option key={g} value={g}>{g}학년</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="예: 5"
                            className="signup-input"
                            value={gc.classNumber}
                            onChange={(e) => handleGradeClassChange(school.id, gc.id, 'classNumber', e.target.value)}
                            min="1"
                            max="20"
                          />
                          {school.gradeClasses.length > 1 && (
                            <button
                              type="button"
                              className="grade-class-remove-btn"
                              onClick={() => removeGradeClass(school.id, gc.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="grade-class-add-btn"
                        onClick={() => addGradeClass(school.id)}
                      >
                        + 학년/반 추가
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="add-school-btn" onClick={addSchool}>
                + 학교 추가
              </button>
            </div>

            {/* 약관 동의 */}
            <div className="signup-terms">
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>이용약관 및 개인정보처리방침에 동의합니다 <span className="required">*</span></span>
              </label>
            </div>

            {/* 제출 버튼 */}
            <button type="submit" className="signup-btn-submit">
              회원가입 완료
            </button>

            {/* 로그인 링크 */}
            <div className="signup-footer-link">
              이미 계정이 있으신가요?{' '}
              <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                로그인하기
              </a>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="signup-footer">
        <div className="signup-footer-content">
          <p>&copy; 2026 우리반 · 모든 권리 보유</p>
        </div>
      </footer>
    </div>
    </>
  );
};

// ─── 학교 자동완성 컴포넌트 ───

interface SchoolAutocompleteProps {
  schoolType: string;
  value: string;
  onSelect: (result: SchoolSearchResult) => void;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SchoolAutocomplete: React.FC<SchoolAutocompleteProps> = ({
  schoolType,
  value,
  onSelect,
  onChange,
  disabled,
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SchoolSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // value가 외부에서 변경되면 동기화
  useEffect(() => {
    setQuery(value);
    setSelected(!!value);
  }, [value]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSchools = useCallback(async (keyword: string) => {
    if (keyword.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const neisType = SCHOOL_TYPE_MAP[schoolType] || undefined;
      const data = await schoolAPI.search(keyword, neisType);
      setResults(data);
      setIsOpen(data.length > 0);
    } catch (error) {
      console.error('학교 검색 실패:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [schoolType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(false);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSchools(val), 300);
  };

  const handleSelect = (result: SchoolSearchResult) => {
    setQuery(result.schoolName);
    setSelected(true);
    setIsOpen(false);
    setResults([]);
    onSelect(result);
  };

  if (disabled) return null;

  return (
    <div className="school-autocomplete" ref={wrapperRef}>
      <div className="school-autocomplete-input-wrapper">
        <input
          type="text"
          placeholder="학교명을 2글자 이상 입력하세요"
          className={`signup-input ${selected ? 'school-selected' : ''}`}
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0 && !selected) setIsOpen(true); }}
          autoComplete="off"
        />
        {isLoading && <span className="school-autocomplete-spinner" />}
        {selected && (
          <button
            type="button"
            className="school-autocomplete-clear"
            onClick={() => {
              setQuery('');
              setSelected(false);
              setResults([]);
              onChange('');
            }}
          >
            &times;
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="school-autocomplete-dropdown">
          {results.map((r) => (
            <li
              key={r.schoolCode}
              className="school-autocomplete-item"
              onClick={() => handleSelect(r)}
            >
              <span className="school-autocomplete-name">{r.schoolName}</span>
              <span className="school-autocomplete-info">
                {r.region} · {r.foundationType || ''} · {r.coeducation || ''}
              </span>
              {r.address && (
                <span className="school-autocomplete-address">{r.address}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && results.length === 0 && !isLoading && query.length >= 2 && (
        <div className="school-autocomplete-dropdown">
          <div className="school-autocomplete-empty">검색 결과가 없습니다</div>
        </div>
      )}
    </div>
  );
};

export default Signup;
