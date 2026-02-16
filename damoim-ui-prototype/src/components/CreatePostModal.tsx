import { useState, useEffect } from 'react';
import { postAPI } from '../api/post';
import { userAPI, SchoolInfo } from '../api/user';
import { getAuthData } from '../utils/auth';
import ConfirmationModal from './ConfirmationModal';
import './CreatePostModal.css';

interface CreatePostModalProps {
  onClose: () => void;
  onPosted: () => void;
  schoolName?: string;
  graduationYear?: string;
  activeTab?: 'all' | 'myGrade' | 'myClass';
}

type Visibility = 'SCHOOL' | 'GRADE' | 'CLASS';

interface GradeClass {
  grade: string;
  classNumber?: string;
}

const tabToVisibility = (tab?: string): Visibility => {
  switch (tab) {
    case 'myGrade': return 'GRADE';
    case 'myClass': return 'CLASS';
    default: return 'SCHOOL';
  }
};

const visibilityLabel = (vis: Visibility): string => {
  switch (vis) {
    case 'GRADE': return '우리 학년';
    case 'CLASS': return '우리 반';
    default: return '우리 학교';
  }
};

export default function CreatePostModal({ onClose, onPosted, schoolName, graduationYear, activeTab }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: 'success' | 'confirm' | 'error'; message: string; onConfirm: () => void; onCancel?: () => void; confirmText?: string } | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  // 공개범위 - 탭에 따라 자동 결정 (수정 불가)
  const visibility: Visibility = tabToVisibility(activeTab);
  const [gradeClasses, setGradeClasses] = useState<GradeClass[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClassNumber, setSelectedClassNumber] = useState<string>('1');

  // 모달 등장 애니메이션
  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true));
  }, []);

  // 사용자의 해당 학교 학년/반 목록 로드
  useEffect(() => {
    const loadGradeClasses = async () => {
      const { user } = getAuthData();
      if (!user || !schoolName) return;
      try {
        const profile = await userAPI.getProfile(user.userId);
        const matching = profile.schools.filter(
          (s: SchoolInfo) => s.schoolName === schoolName && s.graduationYear === graduationYear
        );

        const gc: GradeClass[] = matching
          .filter((s: SchoolInfo) => s.grade)
          .map((s: SchoolInfo) => ({ grade: s.grade!, classNumber: s.classNumber }));
        setGradeClasses(gc);

        if (gc.length > 0) {
          setSelectedGrade(gc[0].grade);
          if (gc[0].classNumber) setSelectedClassNumber(gc[0].classNumber);
        }
      } catch (err) {
        console.error('학년/반 정보 로드 실패:', err);
      }
    };
    loadGradeClasses();
  }, [schoolName, graduationYear]);

  // 학년 변경 시 반 자동 선택
  useEffect(() => {
    if (selectedGrade && gradeClasses.length > 0) {
      const classesForGrade = gradeClasses.filter(gc => gc.grade === selectedGrade && gc.classNumber);
      if (classesForGrade.length > 0) {
        setSelectedClassNumber(classesForGrade[0].classNumber!);
      }
    }
  }, [selectedGrade, gradeClasses]);

  const getVisibilityDescription = (): string => {
    switch (visibility) {
      case 'CLASS':
        return selectedGrade && selectedClassNumber ? `${selectedGrade}학년 ${selectedClassNumber}반에 공개` : '우리 반에 공개';
      case 'GRADE':
        return '같은 졸업연도 동창에게 공개';
      default:
        return '학교 전체에 공개';
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files);

    if (imageFiles.length + selectedFiles.length > 5) {
      setModal({ type: 'error', message: '최대 5개의 이미지만 첨부할 수 있습니다.', onConfirm: () => setModal(null) });
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    selectedFiles.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        setModal({ type: 'error', message: `${file.name}의 크기가 5MB를 초과합니다.`, onConfirm: () => setModal(null) });
        return;
      }

      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
        setModal({ type: 'error', message: `${file.name}은(는) 지원하지 않는 파일 형식입니다.`, onConfirm: () => setModal(null) });
        return;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setImageFiles([...imageFiles, ...validFiles]);
    setImagePreviews([...imagePreviews, ...newPreviews]);
    setError(null);
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setModal({ type: 'error', message: '내용을 입력해주세요.', onConfirm: () => setModal(null) });
      return;
    }

    const { user } = getAuthData();
    if (!user) {
      setModal({ type: 'error', message: '로그인이 필요합니다.', onConfirm: () => setModal(null) });
      return;
    }

    try {
      setPosting(true);
      setError(null);

      const imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        setUploading(true);
        for (const file of imageFiles) {
          const url = await postAPI.uploadImage(file);
          imageUrls.push(url);
        }
        setUploading(false);
      }

      await postAPI.createPost(user.userId, {
        content,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        schoolName,
        graduationYear,
        visibility,
        targetGrade: visibility === 'GRADE' ? selectedGrade : (visibility === 'CLASS' ? selectedGrade : undefined),
        targetClassNumber: visibility === 'CLASS' ? selectedClassNumber : undefined,
      });

      imagePreviews.forEach(url => URL.revokeObjectURL(url));

      onPosted();
      setModal({ type: 'success', message: '게시글이 등록되었습니다.', onConfirm: () => { setModal(null); onClose(); } });
    } catch (err: any) {
      setModal({ type: 'error', message: err.response?.data?.error || '게시글 작성에 실패했습니다.', onConfirm: () => setModal(null) });
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  // 우리 반일 때 반 선택용 데이터
  const uniqueGrades = Array.from(new Set(gradeClasses.map(gc => gc.grade))).filter(Boolean);
  const classesForSelectedGrade = gradeClasses.filter(gc => gc.grade === selectedGrade && gc.classNumber);

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
    <div className={`create-post-backdrop ${animateIn ? 'active' : ''}`} onClick={onClose}>
      <div className={`create-post-modal ${animateIn ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="create-post-header">
          <h2>새 글 작성</h2>
          <button className="create-post-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="create-post-body">
          {/* 공개범위 - 탭에 따라 자동 결정 */}
          <div className="create-post-scope">
            <div className="create-post-scope-row">
              <span className="create-post-scope-title">공개 범위</span>
              <span className="create-post-scope-result">
                {getVisibilityDescription()}
              </span>
            </div>

            <div className="create-post-chips">
              {(['SCHOOL', 'GRADE', 'CLASS'] as Visibility[]).map(vis => (
                <button
                  key={vis}
                  type="button"
                  className={`cp-chip ${visibility === vis ? 'active' : ''} ${visibility !== vis ? 'cp-chip-disabled' : ''}`}
                  disabled
                >
                  {vis === 'SCHOOL' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  )}
                  {vis === 'GRADE' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  )}
                  {vis === 'CLASS' && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                  )}
                  {visibilityLabel(vis)}
                </button>
              ))}
            </div>

            {/* 우리 반일 때만 반 선택 */}
            {visibility === 'CLASS' && uniqueGrades.length > 0 && (
              <>
                <div className="cp-sub-select">
                  <span className="cp-sub-label">학년</span>
                  <div className="cp-sub-chips">
                    {uniqueGrades.map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`cp-sub-chip ${selectedGrade === g ? 'active' : ''}`}
                        onClick={() => setSelectedGrade(g)}
                      >
                        {g}학년
                      </button>
                    ))}
                  </div>
                </div>

                {classesForSelectedGrade.length > 0 && (
                  <div className="cp-sub-select">
                    <span className="cp-sub-label">반</span>
                    <div className="cp-sub-chips">
                      {classesForSelectedGrade.map((gc, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`cp-sub-chip ${selectedClassNumber === gc.classNumber ? 'active' : ''}`}
                          onClick={() => setSelectedClassNumber(gc.classNumber!)}
                        >
                          {gc.classNumber}반
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 텍스트 입력 */}
          <div className="create-post-textarea-wrap">
            <textarea
              placeholder="무슨 생각을 하고 계신가요?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              disabled={posting || uploading}
            />
            <span className="create-post-char-count">{content.length}</span>
          </div>

          {/* 이미지 프리뷰 */}
          {imagePreviews.length > 0 && (
            <div className="create-post-images">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="create-post-image-preview">
                  <img src={preview} alt={`Preview ${index + 1}`} />
                  <button
                    className="create-post-image-remove"
                    onClick={() => handleRemoveImage(index)}
                    disabled={posting || uploading}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6 6 18" /><path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="create-post-error">{error}</div>}
        </div>

        {/* 하단 액션 바 */}
        <div className="create-post-footer">
          <div className="create-post-footer-left">
            <label className="cp-tool-btn" title="이미지 첨부">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                disabled={posting || uploading || imageFiles.length >= 5}
                style={{ display: 'none' }}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              {imageFiles.length > 0 && (
                <span className="cp-tool-badge">{imageFiles.length}</span>
              )}
            </label>
          </div>

          <div className="create-post-footer-right">
            <button
              className="cp-btn-cancel"
              onClick={onClose}
              disabled={posting || uploading}
            >
              취소
            </button>
            <button
              className="cp-btn-submit"
              onClick={handleSubmit}
              disabled={posting || uploading || !content.trim()}
            >
              {uploading ? (
                <><span className="cp-spinner" /> 업로드 중</>
              ) : posting ? (
                <><span className="cp-spinner" /> 작성 중</>
              ) : (
                '게시'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
