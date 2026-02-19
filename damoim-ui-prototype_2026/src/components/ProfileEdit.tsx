import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, ProfileResponse, SchoolUpdateInfo } from '../api/user';
import { schoolAPI, SchoolSearchResult } from '../api/school';
import { getAuthData, saveAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';
import './ProfileEdit.css';

interface GradeClass {
  id: number;
  grade: string;
  classNumber: string;
}

interface EditableSchool {
  id: number;
  schoolCode: string;
  schoolType: string;
  schoolName: string;
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

// 프로필에서 로드한 학교 데이터를 그룹핑 (같은 학교+졸업년도 → 학년/반 배열)
function groupSchools(profileSchools: ProfileResponse['schools']): EditableSchool[] {
  const map = new Map<string, EditableSchool>();
  let schoolId = 1;
  let gcId = 1;

  for (const s of profileSchools) {
    const key = `${s.schoolType}|${s.schoolName}|${s.graduationYear}`;
    if (map.has(key)) {
      const existing = map.get(key)!;
      if (s.grade || s.classNumber) {
        existing.gradeClasses.push({ id: gcId++, grade: s.grade || '', classNumber: s.classNumber || '' });
      }
    } else {
      const gradeClasses: GradeClass[] = [];
      if (s.grade || s.classNumber) {
        gradeClasses.push({ id: gcId++, grade: s.grade || '', classNumber: s.classNumber || '' });
      } else {
        gradeClasses.push({ id: gcId++, grade: '', classNumber: '' });
      }
      map.set(key, {
        id: schoolId++,
        schoolCode: s.schoolCode || '',
        schoolType: s.schoolType,
        schoolName: s.schoolName,
        graduationYear: s.graduationYear,
        gradeClasses,
        graduationYearFrom: null,
        region: '',
      });
    }
  }

  return Array.from(map.values());
}

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [schools, setSchools] = useState<EditableSchool[]>([]);
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string } | null>(null);

  const { user: currentUser } = getAuthData();

  useEffect(() => {
    if (!currentUser) return;

    const fetchProfile = async () => {
      try {
        const data = await userAPI.getProfile(currentUser.userId);
        setProfile(data);
        setName(data.name);
        setBio(data.bio || '');
        setProfileImageUrl(data.profileImageUrl || '');
        setSchools(groupSchools(data.schools));
      } catch (error) {
        console.error('프로필 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSchoolChange = (id: number, field: keyof EditableSchool, value: string) => {
    setSchools(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      if (field === 'schoolType') {
        updated.schoolCode = '';
        updated.schoolName = '';
        updated.graduationYearFrom = null;
        updated.region = '';
      }
      return updated;
    }));
  };

  const handleSchoolSelect = (id: number, result: SchoolSearchResult) => {
    setSchools(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, schoolCode: result.schoolCode, schoolName: result.schoolName, graduationYearFrom: result.graduationYearFrom, region: result.region || '' };
    }));
  };

  const addSchool = () => {
    const newId = schools.length > 0 ? Math.max(...schools.map(s => s.id)) + 1 : 1;
    setSchools(prev => [...prev, {
      id: newId, schoolCode: '', schoolType: '', schoolName: '', graduationYear: '',
      gradeClasses: [{ id: 1, grade: '', classNumber: '' }],
      graduationYearFrom: null, region: '',
    }]);
  };

  const removeSchool = (id: number) => {
    if (schools.length > 1) {
      setSchools(prev => prev.filter(s => s.id !== id));
    }
  };

  const addGradeClass = (schoolId: number) => {
    setSchools(prev => prev.map(s => {
      if (s.id !== schoolId) return s;
      const newId = Math.max(...s.gradeClasses.map(gc => gc.id)) + 1;
      return { ...s, gradeClasses: [...s.gradeClasses, { id: newId, grade: '', classNumber: '' }] };
    }));
  };

  const removeGradeClass = (schoolId: number, gcId: number) => {
    setSchools(prev => prev.map(s => {
      if (s.id !== schoolId || s.gradeClasses.length <= 1) return s;
      return { ...s, gradeClasses: s.gradeClasses.filter(gc => gc.id !== gcId) };
    }));
  };

  const handleGradeClassChange = (schoolId: number, gcId: number, field: 'grade' | 'classNumber', value: string) => {
    setSchools(prev => prev.map(s => {
      if (s.id !== schoolId) return s;
      return {
        ...s,
        gradeClasses: s.gradeClasses.map(gc => gc.id === gcId ? { ...gc, [field]: value } : gc),
      };
    }));
  };

  const getGraduationYears = (school: EditableSchool) => {
    const currentYear = new Date().getFullYear();
    const fromYear = school.graduationYearFrom || (currentYear - 59);
    const years: number[] = [];
    for (let y = currentYear; y >= fromYear; y--) years.push(y);
    return years;
  };

  const getGradeOptions = (schoolType: string) => {
    switch (schoolType) {
      case '초등학교': return [1, 2, 3, 4, 5, 6];
      case '중학교':
      case '고등학교': return [1, 2, 3];
      case '대학교': return [1, 2, 3, 4, 5, 6];
      default: return [1, 2, 3, 4, 5, 6];
    }
  };

  const handleSave = async () => {
    if (!currentUser || !name.trim()) {
      setModal({ type: 'error', message: '이름은 필수 항목입니다.', onConfirm: () => setModal(null) });
      return;
    }

    const validSchools = schools.filter(s => s.schoolType && s.schoolName && s.graduationYear);
    if (validSchools.length === 0) {
      setModal({ type: 'error', message: '최소 1개 이상의 학교 정보를 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    // 학년/반 조합을 각각 별도의 school 항목으로 펼침
    const schoolsData: SchoolUpdateInfo[] = [];
    for (const school of validSchools) {
      const validGCs = school.gradeClasses.filter(gc => gc.grade || gc.classNumber);
      if (validGCs.length === 0) {
        schoolsData.push({
          schoolCode: school.schoolCode || undefined,
          schoolType: school.schoolType,
          schoolName: school.schoolName,
          graduationYear: school.graduationYear,
        });
      } else {
        for (const gc of validGCs) {
          schoolsData.push({
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
      setSaving(true);
      const updated = await userAPI.updateProfile(currentUser.userId, {
        name: name.trim(),
        bio: bio.trim() || undefined,
        profileImageUrl: profileImageUrl.trim() || undefined,
        schools: schoolsData,
      });

      const authData = getAuthData();
      if (authData.token && authData.user) {
        saveAuthData({
          token: authData.token,
          userId: authData.user.userId,
          name: updated.name,
          email: authData.user.email,
        });
      }

      setModal({ type: 'success', message: '프로필이 수정되었습니다!', onConfirm: () => { setModal(null); navigate('/dashboard'); } });
    } catch (error: any) {
      console.error('프로필 수정 실패:', error);
      const msg = error?.response?.data || '프로필 수정에 실패했습니다.';
      setModal({ type: 'error', message: msg, onConfirm: () => setModal(null) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="pe-loading">로딩 중...</div>;
  }

  if (!profile) {
    return <div className="pe-loading">프로필을 찾을 수 없습니다.</div>;
  }

  return (
    <>
    {modal && (
      <ConfirmationModal
        type={modal.type}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
        confirmText={modal.confirmText}
      />
    )}
    <div className="pe-card">
      <div className="pe-header">
        <div className="pe-avatar">
          {profileImageUrl ? (
            <img src={profileImageUrl} alt={name} />
          ) : (
            <div className="pe-avatar-placeholder">
              <span>{name?.[0] || '?'}</span>
            </div>
          )}
        </div>
        <h2 className="pe-title">내 정보 수정</h2>
        <div className="pe-actions">
          <button className="pe-cancel-btn" onClick={() => navigate(-1)}>취소</button>
          <button
            className="pe-save-btn"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="pe-form">
        <div className="pe-field">
          <label>아이디</label>
          <input type="text" className="pe-input pe-readonly" value={profile.userId} disabled />
        </div>

        <div className="pe-field">
          <label>이메일</label>
          <input type="text" className="pe-input pe-readonly" value={profile.email} disabled />
        </div>

        <div className="pe-field pe-full">
          <label>이름 <span className="pe-required">*</span></label>
          <input
            type="text"
            className="pe-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
          />
        </div>

        <div className="pe-field pe-full">
          <label>프로필 이미지 URL</label>
          <input
            type="text"
            className="pe-input"
            value={profileImageUrl}
            onChange={(e) => setProfileImageUrl(e.target.value)}
            placeholder="이미지 URL을 입력하세요 (선택)"
          />
        </div>

        <div className="pe-field pe-full">
          <label>자기소개</label>
          <textarea
            className="pe-textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="자기소개를 입력하세요"
            rows={2}
          />
        </div>

        {/* 학교 정보 수정 */}
        <div className="pe-school-section pe-full">
          <label>학교 정보</label>
          <div className="pe-school-edit-list">
            {schools.map((school, index) => (
              <div key={school.id} className="pe-school-edit-card">
                <div className="pe-school-edit-header">
                  <span className="pe-school-number">{index + 1}번째 학교</span>
                  {schools.length > 1 && (
                    <button
                      type="button"
                      className="pe-school-remove-btn"
                      onClick={() => removeSchool(school.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="pe-school-edit-body">
                  <div className="pe-school-edit-row">
                    <div className="pe-field">
                      <label>학교 유형</label>
                      <select
                        className="pe-input"
                        value={school.schoolType}
                        onChange={(e) => handleSchoolChange(school.id, 'schoolType', e.target.value)}
                      >
                        <option value="">선택</option>
                        <option value="초등학교">초등학교</option>
                        <option value="중학교">중학교</option>
                        <option value="고등학교">고등학교</option>
                        <option value="대학교">대학교</option>
                      </select>
                    </div>

                    <div className="pe-field">
                      <label>졸업년도</label>
                      <select
                        className="pe-input"
                        value={school.graduationYear}
                        onChange={(e) => handleSchoolChange(school.id, 'graduationYear', e.target.value)}
                      >
                        <option value="">선택</option>
                        {getGraduationYears(school).map(year => (
                          <option key={year} value={year}>{year}년</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pe-field">
                    <label>학교명</label>
                    {school.schoolType && school.schoolType !== '대학교' ? (
                      <PeSchoolAutocomplete
                        key={`${school.id}-${school.schoolType}`}
                        schoolType={school.schoolType}
                        value={school.schoolName}
                        onSelect={(result) => handleSchoolSelect(school.id, result)}
                        onChange={(value) => handleSchoolChange(school.id, 'schoolName', value)}
                      />
                    ) : (
                      <input
                        type="text"
                        className="pe-input"
                        value={school.schoolName}
                        onChange={(e) => handleSchoolChange(school.id, 'schoolName', e.target.value)}
                        placeholder={school.schoolType === '대학교' ? '대학교명 입력' : '학교 유형을 먼저 선택하세요'}
                        disabled={!school.schoolType}
                      />
                    )}
                    {school.region && (
                      <span className="pe-region-tag">{school.region}</span>
                    )}
                  </div>

                  {/* 학년/반 (여러 개) */}
                  <div className="pe-gc-section">
                    <div className="pe-gc-label-row">
                      <span className="pe-gc-label">학년</span>
                      <span className="pe-gc-label">반</span>
                    </div>
                    {school.gradeClasses.map((gc) => (
                      <div key={gc.id} className={`pe-gc-row ${school.gradeClasses.length > 1 ? 'pe-gc-has-remove' : ''}`}>
                        <select
                          className="pe-input"
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
                          className="pe-input"
                          value={gc.classNumber}
                          onChange={(e) => handleGradeClassChange(school.id, gc.id, 'classNumber', e.target.value)}
                          placeholder="예: 5"
                          min="1"
                          max="20"
                        />
                        {school.gradeClasses.length > 1 && (
                          <button
                            type="button"
                            className="pe-gc-remove-btn"
                            onClick={() => removeGradeClass(school.id, gc.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="pe-gc-add-btn"
                      onClick={() => addGradeClass(school.id)}
                    >
                      + 학년/반 추가
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="pe-school-add-btn" onClick={addSchool}>
            + 학교 추가
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

// ─── 학교 자동완성 (프로필 수정용) ───

interface PeSchoolAutocompleteProps {
  schoolType: string;
  value: string;
  onSelect: (result: SchoolSearchResult) => void;
  onChange: (value: string) => void;
}

const PeSchoolAutocomplete: React.FC<PeSchoolAutocompleteProps> = ({
  schoolType, value, onSelect, onChange,
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SchoolSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
    setSelected(!!value);
    setResults([]);
    setIsOpen(false);
  }, [value, schoolType]);

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
    if (keyword.trim().length < 2) { setResults([]); return; }
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

  return (
    <div className="pe-autocomplete" ref={wrapperRef}>
      <div className="pe-autocomplete-input-wrapper">
        <input
          type="text"
          placeholder="학교명 2글자 이상 입력"
          className={`pe-input ${selected ? 'pe-selected' : ''}`}
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0 && !selected) setIsOpen(true); }}
          autoComplete="off"
        />
        {isLoading && <span className="pe-autocomplete-spinner" />}
        {selected && (
          <button
            type="button"
            className="pe-autocomplete-clear"
            onClick={() => { setQuery(''); setSelected(false); onChange(''); setResults([]); }}
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <ul className="pe-autocomplete-dropdown">
          {results.length === 0 ? (
            <li className="pe-autocomplete-empty">검색 결과가 없습니다</li>
          ) : (
            results.map(r => (
              <li key={r.id} className="pe-autocomplete-item" onClick={() => handleSelect(r)}>
                <span className="pe-autocomplete-name">{r.schoolName}</span>
                <span className="pe-autocomplete-info">{r.schoolType} · {r.region}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default ProfileEdit;
