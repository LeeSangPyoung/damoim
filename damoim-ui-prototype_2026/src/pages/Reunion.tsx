import { useState, useEffect, useRef } from 'react';
import { getAuthData } from '../utils/auth';
import {
  reunionAPI,
  ReunionResponse,
  MeetingResponse,
  FeeResponse,
  FeeGroupResponse,
  FeeSummaryResponse,
  JoinRequestResponse,
  ReunionPostResponse,
  ReunionCommentResponse,
} from '../api/reunion';
import { userAPI, ClassmateInfo } from '../api/user';
import './Reunion.css';

type View = 'dashboard' | 'detail';
type DetailTab = 'feed' | 'meetings' | 'fees' | 'members';

// ========== Custom DateTimePicker ==========
function BfDateTimePicker({ value, onChange }: { value: {date: string, time: string}, onChange: (v: {date: string, time: string}) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'date' | 'time'>('date');
  const ref = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minScrollRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(value.date ? parseInt(value.date.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.date ? parseInt(value.date.split('-')[1]) - 1 : today.getMonth());

  // 시/분 임시 선택 상태 (확인 누를때까지 반영 안함)
  const [selHour, setSelHour] = useState<number>(value.time ? parseInt(value.time.split(':')[0]) : 18);
  const [selMin, setSelMin] = useState<number>(value.time ? parseInt(value.time.split(':')[1]) : 0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 시간 스텝으로 전환 시 선택된 시간으로 스크롤
  useEffect(() => {
    if (step === 'time') {
      setTimeout(() => {
        const hEl = hourScrollRef.current?.querySelector('.selected');
        if (hEl) hEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const mEl = minScrollRef.current?.querySelector('.selected');
        if (mEl) mEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 50);
    }
  }, [step, selHour, selMin]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDate = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange({ ...value, date: `${viewYear}-${mm}-${dd}` });
    // 시/분 초기값 세팅
    if (value.time) {
      setSelHour(parseInt(value.time.split(':')[0]));
      setSelMin(parseInt(value.time.split(':')[1]));
    }
    setStep('time');
  };

  const confirmTime = () => {
    const hh = String(selHour).padStart(2, '0');
    const mi = String(selMin).padStart(2, '0');
    onChange({ ...value, time: `${hh}:${mi}` });
    setOpen(false);
    setStep('date');
  };

  const selectedDay = value.date ? parseInt(value.date.split('-')[2]) : null;
  const selectedYM = value.date ? `${value.date.split('-')[0]}-${value.date.split('-')[1]}` : null;
  const currentYM = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const displayText = () => {
    if (!value.date) return '날짜 · 시간 선택';
    const parts = value.date.split('-');
    const label = `${parts[0]}년 ${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
    return value.time ? `${label} ${value.time}` : label;
  };

  const hours = Array.from({length: 24}, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="bf-dtp" ref={ref}>
      <button type="button" className="bf-dtp-trigger" onClick={() => { setOpen(!open); setStep('date'); }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className={value.date ? 'bf-dtp-value' : 'bf-dtp-placeholder'}>{displayText()}</span>
      </button>

      {open && (
        <div className="bf-dtp-dropdown">
          {step === 'date' && (
            <div className="bf-dtp-calendar">
              <div className="bf-dtp-cal-header">
                <button type="button" onClick={prevMonth} className="bf-dtp-nav">&lt;</button>
                <span className="bf-dtp-month-label">{viewYear}년 {viewMonth + 1}월</span>
                <button type="button" onClick={nextMonth} className="bf-dtp-nav">&gt;</button>
              </div>
              <div className="bf-dtp-weekdays">
                {['일','월','화','수','목','금','토'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="bf-dtp-days">
                {weeks.map((w, wi) => (
                  <div key={wi} className="bf-dtp-week">
                    {w.map((d, di) => (
                      <button
                        type="button"
                        key={di}
                        className={`bf-dtp-day ${!d ? 'empty' : ''} ${d && selectedDay === d && selectedYM === currentYM ? 'selected' : ''} ${d && d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear() ? 'today' : ''}`}
                        disabled={!d}
                        onClick={() => d && selectDate(d)}
                      >
                        {d || ''}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'time' && (
            <div className="bf-dtp-time">
              <div className="bf-dtp-time-header">
                <button type="button" className="bf-dtp-back" onClick={() => setStep('date')}>
                  &lt; 날짜
                </button>
                <span className="bf-dtp-time-selected">
                  {String(selHour).padStart(2, '0')} : {String(selMin).padStart(2, '0')}
                </span>
              </div>
              <div className="bf-dtp-time-grid">
                <div className="bf-dtp-time-col">
                  <div className="bf-dtp-time-col-label">시</div>
                  <div className="bf-dtp-time-scroll" ref={hourScrollRef}>
                    {hours.map(h => (
                      <button
                        type="button"
                        key={h}
                        className={`bf-dtp-time-btn ${selHour === h ? 'selected' : ''}`}
                        onClick={() => setSelHour(h)}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bf-dtp-time-col">
                  <div className="bf-dtp-time-col-label">분</div>
                  <div className="bf-dtp-time-scroll" ref={minScrollRef}>
                    {minutes.map(m => (
                      <button
                        type="button"
                        key={m}
                        className={`bf-dtp-time-btn ${selMin === m ? 'selected' : ''}`}
                        onClick={() => setSelMin(m)}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" className="bf-dtp-confirm" onClick={confirmTime}>확인</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Reunion() {
  const { user } = getAuthData();

  // View state
  const [view, setView] = useState<View>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [reunions, setReunions] = useState<ReunionResponse[]>([]);
  const [selected, setSelected] = useState<ReunionResponse | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('feed');

  // Feed
  const [posts, setPosts] = useState<ReunionPostResponse[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comments
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [postComments, setPostComments] = useState<Record<number, ReunionCommentResponse[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [replyTo, setReplyTo] = useState<{ postId: number; commentId: number; authorName: string } | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // Meetings
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);

  // Fees
  const [fees, setFees] = useState<FeeResponse[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeeSummaryResponse | null>(null);
  const [feeGroups, setFeeGroups] = useState<FeeGroupResponse[]>([]);
  const [expandedFeeGroups, setExpandedFeeGroups] = useState<Set<number>>(new Set());
  const [showAddFeeGroupMember, setShowAddFeeGroupMember] = useState<number | null>(null);

  // Members
  const [joinRequests, setJoinRequests] = useState<JoinRequestResponse[]>([]);

  // Modals
  const [showCreateReunion, setShowCreateReunion] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showCreateFee, setShowCreateFee] = useState(false);
  const [showConfirmMeeting, setShowConfirmMeeting] = useState<MeetingResponse | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  // Create Reunion form
  const [newReunionName, setNewReunionName] = useState('');
  const [newReunionDesc, setNewReunionDesc] = useState('');
  const [newReunionCover, setNewReunionCover] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Join by code
  const [joinCode, setJoinCode] = useState(['', '', '', '', '', '']);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Create Meeting form
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDesc, setNewMeetingDesc] = useState('');
  const [dateOptions, setDateOptions] = useState<{date: string, time: string}[]>([{date: '', time: ''}]);
  const [locationOptions, setLocationOptions] = useState<string[]>(['']);

  // Create Fee form
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDesc, setFeeDesc] = useState('');
  const [feeDueDate, setFeeDueDate] = useState('');

  // Confirm Meeting form
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmLocation, setConfirmLocation] = useState('');

  // Invite
  const [classmates, setClassmates] = useState<ClassmateInfo[]>([]);
  const [inviteSearch, setInviteSearch] = useState('');

  // Toast
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (user) loadReunions();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  // ========== Load Data ==========
  const loadReunions = async () => {
    if (!user) return;
    try {
      const data = await reunionAPI.getMyReunions(user.userId);
      setReunions(data);
    } catch (e) {
      console.error('모임 목록 로드 실패:', e);
    }
  };

  const openDetail = async (r: ReunionResponse) => {
    if (!user) return;
    try {
      const detail = await reunionAPI.getReunionDetail(r.id, user.userId);
      setSelected(detail);
      setActiveTab('feed');
      setView('detail');
      loadPosts(r.id);
      loadMeetings(r.id);
      loadFees(r.id);
      loadFeeGroups(r.id);
      if (detail.myRole === 'ADMIN' || detail.myRole === 'LEADER') loadJoinRequests(r.id);
    } catch (e) {
      console.error('모임 상세 로드 실패:', e);
    }
  };

  const goBack = () => {
    setView('dashboard');
    setSelected(null);
    loadReunions();
  };

  const loadPosts = async (reunionId: number) => {
    if (!user) return;
    try {
      const data = await reunionAPI.getPosts(reunionId, user.userId);
      setPosts(data);
    } catch (e) {
      console.error('피드 로드 실패:', e);
    }
  };

  const loadMeetings = async (reunionId: number) => {
    if (!user) return;
    try {
      const data = await reunionAPI.getMeetings(reunionId, user.userId);
      setMeetings(data);
    } catch (e) {
      console.error('모임 로드 실패:', e);
    }
  };

  const loadFees = async (reunionId: number) => {
    if (!user) return;
    try {
      const data = await reunionAPI.getFees(reunionId, user.userId);
      setFees(data);
      const summary = await reunionAPI.getFeeSummary(reunionId, user.userId);
      setFeeSummary(summary);
    } catch (e) {
      console.error('회비 로드 실패:', e);
    }
  };

  const loadFeeGroups = async (reunionId: number) => {
    if (!user) return;
    try {
      const data = await reunionAPI.getFeeGroups(reunionId, user.userId);
      setFeeGroups(data);
    } catch (e) {
      console.error('회비 그룹 로드 실패:', e);
    }
  };

  const loadJoinRequests = async (reunionId: number) => {
    if (!user) return;
    try {
      const data = await reunionAPI.getJoinRequests(reunionId, user.userId);
      setJoinRequests(data.filter(r => r.status === 'PENDING'));
    } catch (e) {
      console.error('가입 신청 로드 실패:', e);
    }
  };

  // ========== Reunion CRUD ==========
  const handleCreateReunion = async () => {
    if (!user || !newReunionName.trim()) return;
    try {
      await reunionAPI.createReunion(user.userId, {
        name: newReunionName.trim(),
        description: newReunionDesc.trim() || undefined,
        coverImageUrl: newReunionCover || undefined,
        memberIds: [],
      });
      setShowCreateReunion(false);
      setNewReunionName('');
      setNewReunionDesc('');
      setNewReunionCover('');
      loadReunions();
      showToast('모임이 만들어졌습니다!');
    } catch (e) {
      console.error('모임 생성 실패:', e);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await reunionAPI.uploadImage(file);
      setNewReunionCover(url);
    } catch (err) {
      console.error('커버 업로드 실패:', err);
    }
  };

  // ========== Join by Code ==========
  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newCode = [...joinCode];
    newCode[index] = value.toUpperCase();
    setJoinCode(newCode);
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !joinCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoinByCode = async () => {
    if (!user) return;
    const code = joinCode.join('');
    if (code.length !== 6) return;
    try {
      await reunionAPI.joinByCode(user.userId, code);
      setShowJoinByCode(false);
      setJoinCode(['', '', '', '', '', '']);
      loadReunions();
      showToast('가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.');
    } catch (e: any) {
      const msg = e?.response?.data?.error || '가입 실패';
      showToast(msg);
    }
  };

  // ========== Feed ==========
  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await reunionAPI.uploadImage(file);
      setPostImages(prev => [...prev, url]);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async () => {
    if (!user || !selected || !newPostContent.trim()) return;
    try {
      await reunionAPI.createPost(selected.id, user.userId, {
        content: newPostContent.trim(),
        imageUrls: postImages.length > 0 ? postImages : undefined,
      });
      setNewPostContent('');
      setPostImages([]);
      loadPosts(selected.id);
    } catch (e) {
      console.error('글 작성 실패:', e);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!user || !selected) return;
    if (!window.confirm('글을 삭제하시겠습니까?')) return;
    try {
      await reunionAPI.deletePost(postId, user.userId);
      loadPosts(selected.id);
    } catch (e) {
      console.error('글 삭제 실패:', e);
    }
  };

  const handleLike = async (postId: number) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.togglePostLike(postId, user.userId);
      loadPosts(selected.id);
    } catch (e) {
      console.error('좋아요 실패:', e);
    }
  };

  const toggleComments = async (postId: number) => {
    const next = new Set(expandedComments);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
      await loadComments(postId);
    }
    setExpandedComments(next);
  };

  const loadComments = async (postId: number) => {
    if (!user) return;
    try {
      const data = await reunionAPI.getComments(postId, user.userId);
      setPostComments(prev => ({ ...prev, [postId]: data }));
    } catch (e) {
      console.error('댓글 로드 실패:', e);
    }
  };

  const handleAddComment = async (postId: number) => {
    if (!user || !selected) return;
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      await reunionAPI.addComment(postId, user.userId, content);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      await loadComments(postId);
      loadPosts(selected.id);
    } catch (e) {
      console.error('댓글 작성 실패:', e);
    }
  };

  const handleAddReply = async () => {
    if (!user || !selected || !replyTo) return;
    const content = replyInput.trim();
    if (!content) return;
    try {
      await reunionAPI.addComment(replyTo.postId, user.userId, content, replyTo.commentId);
      setReplyTo(null);
      setReplyInput('');
      await loadComments(replyTo.postId);
      loadPosts(selected.id);
    } catch (e) {
      console.error('답글 작성 실패:', e);
    }
  };

  const handleDeleteComment = async (commentId: number, postId: number) => {
    if (!user || !selected) return;
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await reunionAPI.deleteComment(commentId, user.userId);
      await loadComments(postId);
      loadPosts(selected.id);
    } catch (e) {
      console.error('댓글 삭제 실패:', e);
    }
  };

  // ========== Join Requests ==========
  const handleApprove = async (requestId: number) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.approveJoinRequest(requestId, user.userId);
      loadJoinRequests(selected.id);
      const detail = await reunionAPI.getReunionDetail(selected.id, user.userId);
      setSelected(detail);
      showToast('승인되었습니다');
    } catch (e) {
      console.error('승인 실패:', e);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.rejectJoinRequest(requestId, user.userId);
      loadJoinRequests(selected.id);
      showToast('거절되었습니다');
    } catch (e) {
      console.error('거절 실패:', e);
    }
  };

  const handleRegenerateCode = async () => {
    if (!user || !selected) return;
    if (!window.confirm('초대코드를 재생성하시겠습니까? 기존 코드는 사용할 수 없게 됩니다.')) return;
    try {
      const newCode = await reunionAPI.regenerateInviteCode(selected.id, user.userId);
      setSelected({ ...selected, inviteCode: newCode });
      showToast('초대코드가 재생성되었습니다');
    } catch (e) {
      console.error('코드 재생성 실패:', e);
    }
  };

  const handleCopyCode = () => {
    if (!selected?.inviteCode) return;
    navigator.clipboard.writeText(selected.inviteCode);
    showToast('초대코드가 복사되었습니다');
  };

  // ========== Meetings ==========
  const handleCreateMeeting = async () => {
    if (!user || !selected || !newMeetingTitle.trim()) return;
    try {
      await reunionAPI.createMeeting(selected.id, user.userId, {
        title: newMeetingTitle.trim(),
        description: newMeetingDesc.trim() || undefined,
        dateOptions: dateOptions.filter(d => d.date.trim()).map(d => `${d.date} ${d.time || '00:00'}`),
        locationOptions: locationOptions.filter(l => l.trim()),
      });
      setShowCreateMeeting(false);
      setNewMeetingTitle('');
      setNewMeetingDesc('');
      setDateOptions([{date: '', time: ''}]);
      setLocationOptions(['']);
      loadMeetings(selected.id);
      showToast('모임이 만들어졌습니다');
    } catch (e) {
      console.error('모임 생성 실패:', e);
    }
  };

  const handleVote = async (optionId: number) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.vote(optionId, user.userId);
      loadMeetings(selected.id);
    } catch (e) {
      console.error('투표 실패:', e);
    }
  };

  const handleConfirmMeeting = async () => {
    if (!user || !showConfirmMeeting || !confirmDate.trim() || !confirmLocation.trim()) return;
    try {
      await reunionAPI.confirmMeeting(showConfirmMeeting.id, user.userId, confirmDate.trim(), confirmLocation.trim());
      setShowConfirmMeeting(null);
      setConfirmDate('');
      setConfirmLocation('');
      if (selected) loadMeetings(selected.id);
      showToast('모임이 확정되었습니다');
    } catch (e) {
      console.error('모임 확정 실패:', e);
    }
  };

  const handleCancelMeeting = async (meetingId: number) => {
    if (!user || !selected) return;
    if (!window.confirm('모임을 취소하시겠습니까?')) return;
    try {
      await reunionAPI.cancelMeeting(meetingId, user.userId);
      loadMeetings(selected.id);
    } catch (e) {
      console.error('모임 취소 실패:', e);
    }
  };

  // ========== Fees ==========
  const handleCreateFee = async () => {
    if (!user || !selected || !feeAmount) return;
    try {
      await reunionAPI.createFees(selected.id, user.userId, {
        amount: parseInt(feeAmount),
        description: feeDesc.trim() || undefined,
        dueDate: feeDueDate || undefined,
      });
      setShowCreateFee(false);
      setFeeAmount('');
      setFeeDesc('');
      setFeeDueDate('');
      loadFees(selected.id);
      loadFeeGroups(selected.id);
      showToast('회비가 등록되었습니다');
    } catch (e) {
      console.error('회비 생성 실패:', e);
    }
  };

  const handlePayFee = async (feeId: number, amount: number) => {
    if (!user || !selected) return;
    const input = window.prompt('납부 금액을 입력하세요', String(amount));
    if (!input) return;
    try {
      await reunionAPI.updateFeePayment(feeId, user.userId, parseInt(input));
      loadFees(selected.id);
      showToast('납부 처리되었습니다');
    } catch (e) {
      console.error('납부 실패:', e);
    }
  };

  // ========== Fee Groups ==========
  const toggleFeeGroup = (groupId: number) => {
    const next = new Set(expandedFeeGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setExpandedFeeGroups(next);
  };

  const handleToggleFeePayment = async (feeId: number) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.toggleFeePayment(feeId, user.userId);
      loadFeeGroups(selected.id);
      loadFees(selected.id);
    } catch (e) {
      console.error('납부 토글 실패:', e);
    }
  };

  const handleAddMemberToFeeGroup = async (feeGroupId: number, targetUserId: string) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.addMemberToFeeGroup(feeGroupId, user.userId, targetUserId);
      loadFeeGroups(selected.id);
      loadFees(selected.id);
      showToast('멤버가 추가되었습니다');
    } catch (e: any) {
      showToast(e?.response?.data?.error || '추가 실패');
    }
  };

  const handleRemoveMemberFromFeeGroup = async (feeGroupId: number, targetUserId: string, targetName: string) => {
    if (!user || !selected) return;
    if (!window.confirm(`${targetName}님을 이 회비에서 제외하시겠습니까?`)) return;
    try {
      await reunionAPI.removeMemberFromFeeGroup(feeGroupId, user.userId, targetUserId);
      loadFeeGroups(selected.id);
      loadFees(selected.id);
      showToast('멤버가 제외되었습니다');
    } catch (e) {
      console.error('회비 멤버 제외 실패:', e);
    }
  };

  const handleDeleteFeeGroup = async (feeGroupId: number) => {
    if (!user || !selected) return;
    if (!window.confirm('이 회비를 삭제하시겠습니까? 모든 납부 기록이 삭제됩니다.')) return;
    try {
      await reunionAPI.deleteFeeGroup(feeGroupId, user.userId);
      loadFeeGroups(selected.id);
      loadFees(selected.id);
      showToast('회비가 삭제되었습니다');
    } catch (e) {
      console.error('회비 삭제 실패:', e);
    }
  };

  // ========== 총무 관리 ==========
  const handleAssignTreasurer = async (targetUserId: string, targetName: string) => {
    if (!user || !selected) return;
    if (!window.confirm(`${targetName}님을 총무로 지정하시겠습니까?`)) return;
    try {
      await reunionAPI.assignTreasurer(selected.id, user.userId, targetUserId);
      const detail = await reunionAPI.getReunionDetail(selected.id, user.userId);
      setSelected(detail);
      showToast(`${targetName}님이 총무로 지정되었습니다`);
    } catch (e: any) {
      showToast(e?.response?.data?.error || '총무 지정 실패');
    }
  };

  const handleRemoveTreasurer = async () => {
    if (!user || !selected) return;
    if (!window.confirm('총무를 해제하시겠습니까?')) return;
    try {
      await reunionAPI.removeTreasurer(selected.id, user.userId);
      const detail = await reunionAPI.getReunionDetail(selected.id, user.userId);
      setSelected(detail);
      showToast('총무가 해제되었습니다');
    } catch (e) {
      console.error('총무 해제 실패:', e);
    }
  };

  // ========== Members ==========
  const handleOpenInvite = async () => {
    if (!user) return;
    try {
      const profile = await userAPI.getProfile(user.userId);
      const allClassmates: ClassmateInfo[] = [];
      if (profile.schools && profile.schools.length > 0) {
        for (const school of profile.schools) {
          if (school.schoolCode && school.graduationYear) {
            const data = await userAPI.searchClassmates(user.userId, school.schoolCode, school.graduationYear.toString());
            allClassmates.push(...data.classmates);
          }
        }
      }
      const unique = allClassmates.filter((c, i, arr) => arr.findIndex(x => x.userId === c.userId) === i);
      setClassmates(unique);
      setShowInvite(true);
    } catch (e) {
      console.error('동창 목록 로드 실패:', e);
    }
  };

  const handleInvite = async (targetUserId: string) => {
    if (!user || !selected) return;
    try {
      await reunionAPI.inviteMembers(selected.id, user.userId, [targetUserId]);
      const detail = await reunionAPI.getReunionDetail(selected.id, user.userId);
      setSelected(detail);
      loadReunions();
      showToast('초대되었습니다');
    } catch (e) {
      console.error('초대 실패:', e);
    }
  };

  const handleLeave = async () => {
    if (!user || !selected) return;
    if (!window.confirm(`"${selected.name}" 모임을 탈퇴하시겠습니까?`)) return;
    try {
      await reunionAPI.leaveReunion(selected.id, user.userId);
      goBack();
      showToast('탈퇴되었습니다');
    } catch (e) {
      console.error('탈퇴 실패:', e);
    }
  };

  const handleKick = async (targetUserId: string, targetName: string) => {
    if (!user || !selected) return;
    if (!window.confirm(`${targetName}님을 추방하시겠습니까?`)) return;
    try {
      await reunionAPI.removeMember(selected.id, user.userId, targetUserId);
      const detail = await reunionAPI.getReunionDetail(selected.id, user.userId);
      setSelected(detail);
      loadReunions();
      showToast('추방되었습니다');
    } catch (e) {
      console.error('추방 실패:', e);
    }
  };

  // ========== Helpers ==========
  const getMaxVotes = (meeting: MeetingResponse) => {
    const all = [...meeting.dateOptions, ...meeting.locationOptions];
    return Math.max(1, ...all.map(o => o.voteCount));
  };

  const isLeader = selected?.myRole === 'LEADER' || selected?.myRole === 'ADMIN';
  const canManageFees = isLeader || selected?.myRole === 'TREASURER';

  const memberIds = selected ? selected.members.map(m => m.userId) : [];
  const filteredClassmates = classmates.filter(c =>
    !memberIds.includes(c.userId) &&
    (inviteSearch === '' || c.name.includes(inviteSearch) || c.userId.includes(inviteSearch))
  );

  const filteredReunions = reunions.filter(r =>
    searchQuery === '' || r.name.includes(searchQuery) || (r.schoolName || '').includes(searchQuery)
  );

  const statusLabel: Record<string, string> = {
    VOTING: '투표 중', CONFIRMED: '확정', COMPLETED: '완료', CANCELLED: '취소',
  };
  const feeStatusLabel: Record<string, string> = {
    PAID: '완납', UNPAID: '미납', PARTIAL: '부분납부',
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };

  const apiBaseUrl = (window as any).__API_BASE_URL__ || 'http://localhost:8080';

  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${apiBaseUrl}${url}`;
  };

  // ========== RENDER ==========
  return (
    <div className="bf-container">
      {/* ===== VIEW 1: Dashboard ===== */}
      {view === 'dashboard' && (
        <>
          <div className="bf-dashboard-header">
            <h2>베스트프랜드</h2>
            <div className="bf-header-actions">
              <button className="bf-btn-secondary" onClick={() => setShowJoinByCode(true)}>초대코드 입력</button>
              <button className="bf-btn-primary" onClick={() => setShowCreateReunion(true)}>+ 모임 만들기</button>
            </div>
          </div>

          <div className="bf-search-bar">
            <div className="bf-search-wrapper">
              <svg className="bf-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                placeholder="모임 이름 또는 학교명으로 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredReunions.length === 0 ? (
            <div className="bf-empty">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p>아직 가입한 모임이 없습니다</p>
              <p className="bf-empty-sub">모임을 만들거나 초대코드를 입력해 참여하세요</p>
            </div>
          ) : (
            <div className="bf-card-grid">
              {filteredReunions.map(r => (
                <div key={r.id} className="bf-card" onClick={() => openDetail(r)}>
                  <div
                    className="bf-card-cover"
                    style={r.coverImageUrl ? { backgroundImage: `url(${getImageUrl(r.coverImageUrl)})` } : undefined}
                  >
                    <div className="bf-card-cover-overlay" />
                  </div>
                  <div className="bf-card-body">
                    <div className="bf-card-name">{r.name}</div>
                    <div className="bf-card-meta">
                      <span>{r.memberCount}명</span>
                      {r.schoolName && <span>{r.schoolName}</span>}
                      {r.graduationYear && <span>{r.graduationYear}년</span>}
                    </div>
                    {r.description && <div className="bf-card-desc">{r.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== VIEW 2: Detail ===== */}
      {view === 'detail' && selected && (
        <div className="bf-detail">
          {/* Cover Header */}
          <div
            className="bf-cover-header"
            style={selected.coverImageUrl ? { backgroundImage: `url(${getImageUrl(selected.coverImageUrl)})` } : undefined}
          >
            <div className="bf-cover-overlay" />
            <button className="bf-back-btn" onClick={goBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
              </svg>
            </button>
            <div className="bf-cover-info">
              <h2>{selected.name}</h2>
              <div className="bf-cover-info-meta">
                <span>{selected.memberCount}명</span>
                {selected.schoolName && <span>{selected.schoolName}</span>}
                {selected.graduationYear && <span>{selected.graduationYear}년 졸업</span>}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bf-tabs">
            {(['feed', 'meetings', 'fees', 'members'] as DetailTab[]).map(tab => (
              <button
                key={tab}
                className={`bf-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {{ feed: '피드', meetings: '모임', fees: '회비', members: '멤버' }[tab]}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bf-tab-content">
            {/* ===== Feed Tab ===== */}
            {activeTab === 'feed' && (
              <>
                <div className="bf-feed-write">
                  <textarea
                    placeholder="무슨 이야기를 나누고 싶으세요?"
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                  />
                  {postImages.length > 0 && (
                    <div className="bf-feed-images-preview">
                      {postImages.map((img, i) => (
                        <div key={i} className="bf-feed-preview-wrap">
                          <img src={getImageUrl(img)} alt="" className="bf-preview-img" />
                          <button className="bf-feed-preview-remove" onClick={() => setPostImages(postImages.filter((_, j) => j !== i))}>x</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bf-feed-write-actions">
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePostImageUpload}
                      />
                      <button className="bf-feed-attach-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                          <path d="m21 15-5-5L5 21"/>
                        </svg>
                        {uploadingImage ? '업로드 중...' : '사진'}
                      </button>
                    </div>
                    <button className="bf-feed-submit-btn" onClick={handleCreatePost} disabled={!newPostContent.trim()}>
                      게시
                    </button>
                  </div>
                </div>

                <div className="bf-feed-list">
                  {posts.length === 0 && <div className="bf-feed-empty">아직 작성된 글이 없습니다</div>}
                  {posts.map(post => (
                    <div key={post.id} className="bf-feed-card">
                      <div className="bf-feed-card-header">
                        <div className="bf-feed-avatar">
                          {post.authorProfileImageUrl
                            ? <img src={getImageUrl(post.authorProfileImageUrl)} alt="" />
                            : post.authorName[0]
                          }
                        </div>
                        <div className="bf-feed-author-info">
                          <div className="bf-feed-author-name">{post.authorName}</div>
                          <div className="bf-feed-time">{formatTime(post.createdAt)}</div>
                        </div>
                        {(post.authorUserId === user?.userId || isLeader) && (
                          <button className="bf-feed-delete-btn" onClick={() => handleDeletePost(post.id)} title="삭제">...</button>
                        )}
                      </div>
                      <div className="bf-feed-content">{post.content}</div>
                      {post.imageUrls && post.imageUrls.length > 0 && (
                        <div className="bf-feed-images">
                          {post.imageUrls.map((img, i) => (
                            <img key={i} src={getImageUrl(img)} alt="" />
                          ))}
                        </div>
                      )}

                      {/* 액션바: 좋아요, 댓글, 조회수 */}
                      <div className="bf-feed-stats">
                        <button
                          className={`bf-like-btn ${post.liked ? 'liked' : ''}`}
                          onClick={() => handleLike(post.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {post.likeCount}
                        </button>
                        <button className="bf-stat-btn" onClick={() => toggleComments(post.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          {post.commentCount}
                        </button>
                        <span className="bf-stat-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          {post.viewCount}
                        </span>
                      </div>

                      {/* 인라인 댓글 섹션 */}
                      {expandedComments.has(post.id) && (
                        <div className="bf-comments-section">
                          <div className="bf-comments-list">
                            {(postComments[post.id] || []).map(comment => (
                              <div key={comment.id} className="bf-comment">
                                <div className="bf-comment-avatar">
                                  {comment.authorProfileImageUrl
                                    ? <img src={getImageUrl(comment.authorProfileImageUrl)} alt="" />
                                    : comment.authorName[0]
                                  }
                                </div>
                                <div className="bf-comment-body">
                                  <div className="bf-comment-header">
                                    <span className="bf-comment-name">{comment.authorName}</span>
                                    <span className="bf-comment-time">{formatTime(comment.createdAt)}</span>
                                  </div>
                                  <div className="bf-comment-content">{comment.content}</div>
                                  <div className="bf-comment-actions">
                                    <button className="bf-comment-reply-btn" onClick={() => { setReplyTo({ postId: post.id, commentId: comment.id, authorName: comment.authorName }); setReplyInput(''); }}>답글</button>
                                    {comment.canDelete && (
                                      <button className="bf-comment-delete-btn" onClick={() => handleDeleteComment(comment.id, post.id)}>삭제</button>
                                    )}
                                  </div>
                                  {/* 답글 입력 */}
                                  {replyTo?.commentId === comment.id && (
                                    <div className="bf-reply-input-wrap">
                                      <input
                                        className="bf-reply-input"
                                        value={replyInput}
                                        onChange={e => setReplyInput(e.target.value)}
                                        placeholder={`${replyTo.authorName}님에게 답글...`}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddReply(); } }}
                                        autoFocus
                                      />
                                      <button className="bf-reply-submit" onClick={handleAddReply} disabled={!replyInput.trim()}>등록</button>
                                      <button className="bf-reply-cancel" onClick={() => setReplyTo(null)}>취소</button>
                                    </div>
                                  )}
                                  {/* 대댓글 */}
                                  {comment.replies && comment.replies.length > 0 && (
                                    <div className="bf-replies">
                                      {comment.replies.map(reply => (
                                        <div key={reply.id} className="bf-comment reply">
                                          <div className="bf-comment-avatar small">
                                            {reply.authorProfileImageUrl
                                              ? <img src={getImageUrl(reply.authorProfileImageUrl)} alt="" />
                                              : reply.authorName[0]
                                            }
                                          </div>
                                          <div className="bf-comment-body">
                                            <div className="bf-comment-header">
                                              <span className="bf-comment-name">{reply.authorName}</span>
                                              <span className="bf-comment-time">{formatTime(reply.createdAt)}</span>
                                            </div>
                                            <div className="bf-comment-content">{reply.content}</div>
                                            {reply.canDelete && (
                                              <div className="bf-comment-actions">
                                                <button className="bf-comment-delete-btn" onClick={() => handleDeleteComment(reply.id, post.id)}>삭제</button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 댓글 입력 */}
                          <div className="bf-comment-input-wrap">
                            <input
                              className="bf-comment-input"
                              value={commentInputs[post.id] || ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="댓글을 입력하세요..."
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id); } }}
                            />
                            <button className="bf-comment-submit" onClick={() => handleAddComment(post.id)} disabled={!(commentInputs[post.id] || '').trim()}>등록</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== Meetings Tab ===== */}
            {activeTab === 'meetings' && (
              <>
                <div className="bf-meeting-header">
                  <h4>모임 목록</h4>
                  <button className="bf-btn-primary" onClick={() => setShowCreateMeeting(true)}>+ 모임 만들기</button>
                </div>

                {meetings.length === 0 && <div className="bf-meeting-empty">아직 등록된 모임이 없습니다</div>}

                {meetings.map(mt => (
                  <div key={mt.id} className="bf-meeting-card">
                    <div className="bf-meeting-card-header">
                      <div className="bf-meeting-title">{mt.title}</div>
                      <span className={`bf-meeting-status ${mt.status.toLowerCase()}`}>{statusLabel[mt.status]}</span>
                    </div>
                    {mt.description && <div className="bf-meeting-desc">{mt.description}</div>}

                    {mt.status === 'CONFIRMED' && (
                      <div className="bf-meeting-confirmed-info">
                        <strong>확정된 일정</strong>
                        <span>날짜: {mt.finalDate}</span>
                        <span>장소: {mt.finalLocation}</span>
                      </div>
                    )}

                    {mt.status === 'VOTING' && (
                      <>
                        {mt.dateOptions.length > 0 && (
                          <div className="bf-vote-section">
                            <div className="bf-vote-section-title">날짜 투표</div>
                            {mt.dateOptions.map(opt => (
                              <div key={opt.id} className={`bf-vote-option ${opt.myVote ? 'voted' : ''}`} onClick={() => handleVote(opt.id)} title={opt.myVote ? '클릭하여 투표 취소' : '클릭하여 투표'}>
                                {opt.myVote && <span className="bf-vote-check">✓</span>}
                                <span className="bf-vote-option-text">{opt.optionValue}</span>
                                <div className="bf-vote-option-bar">
                                  <div className="bf-vote-option-bar-fill" style={{ width: `${(opt.voteCount / getMaxVotes(mt)) * 100}%` }} />
                                </div>
                                <span className="bf-vote-option-count">{opt.voteCount}</span>
                                <span className="bf-vote-voters">{opt.voters.map(v => v.name).join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {mt.locationOptions.length > 0 && (
                          <div className="bf-vote-section">
                            <div className="bf-vote-section-title">장소 투표</div>
                            {mt.locationOptions.map(opt => (
                              <div key={opt.id} className={`bf-vote-option ${opt.myVote ? 'voted' : ''}`} onClick={() => handleVote(opt.id)} title={opt.myVote ? '클릭하여 투표 취소' : '클릭하여 투표'}>
                                {opt.myVote && <span className="bf-vote-check">✓</span>}
                                <span className="bf-vote-option-text">{opt.optionValue}</span>
                                <div className="bf-vote-option-bar">
                                  <div className="bf-vote-option-bar-fill" style={{ width: `${(opt.voteCount / getMaxVotes(mt)) * 100}%` }} />
                                </div>
                                <span className="bf-vote-option-count">{opt.voteCount}</span>
                                <span className="bf-vote-voters">{opt.voters.map(v => v.name).join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {isLeader && mt.status === 'VOTING' && (
                      <div className="bf-meeting-admin-actions">
                        <button className="bf-meeting-confirm-btn" onClick={() => { setShowConfirmMeeting(mt); setConfirmDate(''); setConfirmLocation(''); }}>확정하기</button>
                        <button className="bf-meeting-cancel-btn" onClick={() => handleCancelMeeting(mt.id)}>취소하기</button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ===== Fees Tab ===== */}
            {activeTab === 'fees' && (
              <>
                {feeSummary && (
                  <div className="bf-fee-summary">
                    <div className="bf-fee-summary-card">
                      <div className="bf-fee-summary-label">전체 금액</div>
                      <div className="bf-fee-summary-value">{feeSummary.totalAmount.toLocaleString()}원</div>
                    </div>
                    <div className="bf-fee-summary-card">
                      <div className="bf-fee-summary-label">납부 완료</div>
                      <div className="bf-fee-summary-value paid">{feeSummary.totalPaid.toLocaleString()}원</div>
                    </div>
                    <div className="bf-fee-summary-card">
                      <div className="bf-fee-summary-label">미납 금액</div>
                      <div className="bf-fee-summary-value unpaid">{feeSummary.totalUnpaid.toLocaleString()}원</div>
                    </div>
                  </div>
                )}

                <div className="bf-fee-header">
                  <h4>회비 내역</h4>
                  {canManageFees && (
                    <button className="bf-btn-primary" onClick={() => setShowCreateFee(true)}>+ 회비 등록</button>
                  )}
                </div>

                {feeGroups.length === 0 ? (
                  <div className="bf-fee-empty">등록된 회비가 없습니다</div>
                ) : (
                  <div className="bf-fee-group-list">
                    {feeGroups.map(group => {
                      const isExpanded = expandedFeeGroups.has(group.id);
                      const progressPct = group.totalMembers > 0 ? Math.round((group.paidCount / group.totalMembers) * 100) : 0;
                      return (
                        <div key={group.id} className="bf-fee-group-card">
                          <div className="bf-fee-group-header" onClick={() => toggleFeeGroup(group.id)}>
                            <div className="bf-fee-group-header-left">
                              <span className={`bf-fee-group-arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
                              <div className="bf-fee-group-info">
                                <div className="bf-fee-group-title">{group.description}</div>
                                <div className="bf-fee-group-meta">
                                  {group.amountPerMember.toLocaleString()}원/인 · {group.paidCount}/{group.totalMembers}명 납부
                                  {group.dueDate && <span> · 마감: {group.dueDate}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="bf-fee-group-header-right">
                              <span className="bf-fee-group-amount">{group.totalPaid.toLocaleString()} / {group.totalAmount.toLocaleString()}원</span>
                            </div>
                          </div>
                          <div className="bf-fee-group-progress">
                            <div className="bf-fee-group-progress-bar" style={{ width: `${progressPct}%` }} />
                          </div>

                          {isExpanded && (
                            <div className="bf-fee-group-body">
                              {group.fees.map(f => (
                                <div key={f.id} className="bf-fee-member-row">
                                  <div className="bf-fee-member-name">{f.userName}</div>
                                  <div className="bf-fee-member-amount">{f.amount.toLocaleString()}원</div>
                                  <span className={`bf-fee-status ${f.status.toLowerCase()}`}>{feeStatusLabel[f.status]}</span>
                                  {canManageFees && (
                                    <div className="bf-fee-member-actions">
                                      {f.status === 'UNPAID' ? (
                                        <button className="bf-fee-toggle-btn confirm" onClick={() => handleToggleFeePayment(f.id)}>납부확인</button>
                                      ) : (
                                        <button className="bf-fee-toggle-btn undo" onClick={() => handleToggleFeePayment(f.id)}>취소</button>
                                      )}
                                      <button className="bf-fee-remove-btn" onClick={() => handleRemoveMemberFromFeeGroup(group.id, f.userId, f.userName)}>제외</button>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {canManageFees && (
                                <div className="bf-fee-group-actions">
                                  <button className="bf-btn-secondary bf-fee-add-member-btn" onClick={() => setShowAddFeeGroupMember(showAddFeeGroupMember === group.id ? null : group.id)}>+ 멤버 추가</button>
                                  <button className="bf-fee-delete-group-btn" onClick={() => handleDeleteFeeGroup(group.id)}>회비 삭제</button>
                                </div>
                              )}

                              {showAddFeeGroupMember === group.id && selected && (
                                <div className="bf-fee-add-member-list">
                                  {selected.members
                                    .filter(m => !group.fees.some(f => f.userId === m.userId))
                                    .map(m => (
                                      <div key={m.userId} className="bf-fee-add-member-row">
                                        <span>{m.name}</span>
                                        <button className="bf-fee-add-member-row-btn" onClick={() => handleAddMemberToFeeGroup(group.id, m.userId)}>추가</button>
                                      </div>
                                    ))
                                  }
                                  {selected.members.filter(m => !group.fees.some(f => f.userId === m.userId)).length === 0 && (
                                    <div className="bf-fee-add-member-empty">추가 가능한 멤버가 없습니다</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ===== Members Tab ===== */}
            {activeTab === 'members' && (
              <>
                {/* Invite Code */}
                {selected.inviteCode && (
                  <div className="bf-invite-code-section">
                    <h4>초대코드</h4>
                    <div className="bf-invite-code-display">{selected.inviteCode}</div>
                    <div className="bf-invite-code-actions">
                      <button className="bf-code-copy-btn" onClick={handleCopyCode}>코드 복사</button>
                      {isLeader && (
                        <button className="bf-code-regen-btn" onClick={handleRegenerateCode}>재생성</button>
                      )}
                    </div>
                  </div>
                )}

                {/* Join Requests (leader only) */}
                {isLeader && joinRequests.length > 0 && (
                  <div className="bf-join-requests">
                    <h4 className="bf-section-title">
                      가입 대기
                      <span className="bf-badge">{joinRequests.length}</span>
                    </h4>
                    {joinRequests.map(req => (
                      <div key={req.id} className="bf-request-card">
                        <div className="bf-request-avatar">
                          {req.userName[0]}
                        </div>
                        <div className="bf-request-info">
                          <div className="bf-request-name">{req.userName}</div>
                          <div className="bf-request-time">{formatTime(req.requestedAt)}</div>
                        </div>
                        <div className="bf-request-actions">
                          <button className="bf-approve-btn" onClick={() => handleApprove(req.id)}>승인</button>
                          <button className="bf-reject-btn" onClick={() => handleReject(req.id)}>거절</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 총무 관리 (모임장만) */}
                {isLeader && (
                  <div className="bf-treasurer-section">
                    <h4 className="bf-section-title">총무 관리</h4>
                    {selected.members.some(m => m.role === 'TREASURER') ? (
                      <div className="bf-treasurer-info">
                        <span>현재 총무: <strong>{selected.members.find(m => m.role === 'TREASURER')?.name}</strong></span>
                        <button className="bf-treasurer-remove-btn" onClick={handleRemoveTreasurer}>해제</button>
                      </div>
                    ) : (
                      <div className="bf-treasurer-info">
                        <span style={{ color: '#9ca3af' }}>지정된 총무가 없습니다</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Member List */}
                <h4 className="bf-section-title">멤버 ({selected.members.length})</h4>
                <div className="bf-member-list">
                  {selected.members.map(m => {
                    const roleLabel = (m.role === 'LEADER' || m.role === 'ADMIN') ? '모임장' : m.role === 'TREASURER' ? '총무' : null;
                    const roleClass = (m.role === 'LEADER' || m.role === 'ADMIN') ? 'leader' : m.role === 'TREASURER' ? 'treasurer' : '';
                    return (
                      <div key={m.userId} className="bf-member-row">
                        <div className={`bf-member-avatar ${roleClass}`}>
                          {m.profileImageUrl
                            ? <img src={getImageUrl(m.profileImageUrl)} alt="" />
                            : m.name[0]
                          }
                        </div>
                        <div className="bf-member-name">{m.name}</div>
                        {roleLabel && <span className={`bf-member-badge ${roleClass}`}>{roleLabel}</span>}
                        <div className="bf-member-row-actions">
                          {isLeader && m.role === 'MEMBER' && m.userId !== user?.userId && (
                            <button className="bf-treasurer-assign-btn" onClick={() => handleAssignTreasurer(m.userId, m.name)}>총무 지정</button>
                          )}
                          {isLeader && m.userId !== user?.userId && (
                            <button className="bf-member-kick-btn" onClick={() => handleKick(m.userId, m.name)}>추방</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bf-member-bottom-actions">
                  {isLeader && (
                    <button className="bf-btn-primary" onClick={handleOpenInvite}>+ 멤버 초대</button>
                  )}
                  <button className="bf-leave-btn" onClick={handleLeave}>모임 나가기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========== MODALS ========== */}

      {/* Create Reunion */}
      {showCreateReunion && (
        <div className="bf-modal-backdrop" onClick={() => setShowCreateReunion(false)}>
          <div className="bf-modal" onClick={e => e.stopPropagation()}>
            <div className="bf-modal-header">
              <h3>모임 만들기</h3>
              <button className="bf-modal-close" onClick={() => setShowCreateReunion(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bf-modal-body">
              <div className="bf-modal-field">
                <label>커버 이미지</label>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
                <div className="bf-cover-upload" onClick={() => coverInputRef.current?.click()}>
                  {newReunionCover ? (
                    <img src={getImageUrl(newReunionCover)} alt="커버" />
                  ) : (
                    <div className="bf-cover-upload-text">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="m21 15-5-5L5 21"/>
                      </svg>
                      <div style={{ marginTop: 4 }}>클릭하여 커버 이미지 업로드</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bf-modal-field">
                <label>모임 이름 *</label>
                <input value={newReunionName} onChange={e => setNewReunionName(e.target.value)} placeholder="예: 서울중 96년 졸업 동창회" />
              </div>
              <div className="bf-modal-field">
                <label>설명</label>
                <textarea value={newReunionDesc} onChange={e => setNewReunionDesc(e.target.value)} placeholder="모임에 대한 간단한 설명" />
              </div>
            </div>
            <div className="bf-modal-footer">
              <button className="bf-modal-cancel" onClick={() => setShowCreateReunion(false)}>취소</button>
              <button className="bf-modal-submit" onClick={handleCreateReunion} disabled={!newReunionName.trim()}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code */}
      {showJoinByCode && (
        <div className="bf-modal-backdrop" onClick={() => setShowJoinByCode(false)}>
          <div className="bf-modal" onClick={e => e.stopPropagation()}>
            <div className="bf-modal-header">
              <h3>초대코드로 참여</h3>
              <button className="bf-modal-close" onClick={() => setShowJoinByCode(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bf-modal-body" style={{ textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>모임에서 받은 6자리 초대코드를 입력하세요</p>
              <div className="bf-code-input-wrapper">
                {joinCode.map((c, i) => (
                  <input
                    key={i}
                    ref={el => { codeInputRefs.current[i] = el; }}
                    className="bf-code-input"
                    value={c}
                    onChange={e => handleCodeInput(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    maxLength={2}
                  />
                ))}
              </div>
            </div>
            <div className="bf-modal-footer">
              <button className="bf-modal-cancel" onClick={() => { setShowJoinByCode(false); setJoinCode(['', '', '', '', '', '']); }}>취소</button>
              <button className="bf-modal-submit" onClick={handleJoinByCode} disabled={joinCode.join('').length !== 6}>가입 신청</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Meeting */}
      {showCreateMeeting && (
        <div className="bf-modal-backdrop" onClick={() => setShowCreateMeeting(false)}>
          <div className="bf-modal" onClick={e => e.stopPropagation()}>
            <div className="bf-modal-header">
              <h3>모임 만들기</h3>
              <button className="bf-modal-close" onClick={() => setShowCreateMeeting(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bf-modal-body">
              <div className="bf-modal-field">
                <label>모임 제목 *</label>
                <input value={newMeetingTitle} onChange={e => setNewMeetingTitle(e.target.value)} placeholder="예: 2026년 봄 정기모임" />
              </div>
              <div className="bf-modal-field">
                <label>설명</label>
                <textarea value={newMeetingDesc} onChange={e => setNewMeetingDesc(e.target.value)} placeholder="모임에 대한 설명" />
              </div>
              <div className="bf-modal-field">
                <label>날짜 옵션</label>
                <div className="bf-option-list">
                  {dateOptions.map((d, i) => (
                    <div key={i} className="bf-option-row">
                      <BfDateTimePicker
                        value={d}
                        onChange={v => { const arr = [...dateOptions]; arr[i] = v; setDateOptions(arr); }}
                      />
                      {dateOptions.length > 1 && <button className="bf-option-remove" onClick={() => setDateOptions(dateOptions.filter((_, j) => j !== i))}>x</button>}
                    </div>
                  ))}
                  <button className="bf-option-add" onClick={() => setDateOptions([...dateOptions, {date: '', time: ''}])}>+ 날짜 추가</button>
                </div>
              </div>
              <div className="bf-modal-field">
                <label>장소 옵션</label>
                <div className="bf-option-list">
                  {locationOptions.map((l, i) => (
                    <div key={i} className="bf-option-row">
                      <input value={l} onChange={e => { const arr = [...locationOptions]; arr[i] = e.target.value; setLocationOptions(arr); }} placeholder="예: 강남역 근처 한우집" />
                      {locationOptions.length > 1 && <button className="bf-option-remove" onClick={() => setLocationOptions(locationOptions.filter((_, j) => j !== i))}>x</button>}
                    </div>
                  ))}
                  <button className="bf-option-add" onClick={() => setLocationOptions([...locationOptions, ''])}>+ 장소 추가</button>
                </div>
              </div>
            </div>
            <div className="bf-modal-footer">
              <button className="bf-modal-cancel" onClick={() => setShowCreateMeeting(false)}>취소</button>
              <button className="bf-modal-submit" onClick={handleCreateMeeting} disabled={!newMeetingTitle.trim()}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Meeting */}
      {showConfirmMeeting && (
        <div className="bf-modal-backdrop" onClick={() => setShowConfirmMeeting(null)}>
          <div className="bf-modal" onClick={e => e.stopPropagation()}>
            <div className="bf-modal-header">
              <h3>모임 확정</h3>
              <button className="bf-modal-close" onClick={() => setShowConfirmMeeting(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bf-modal-body">
              <div className="bf-modal-field">
                <label>확정 날짜 *</label>
                <input value={confirmDate} onChange={e => setConfirmDate(e.target.value)} placeholder="예: 2026-03-15 18:00" />
              </div>
              <div className="bf-modal-field">
                <label>확정 장소 *</label>
                <input value={confirmLocation} onChange={e => setConfirmLocation(e.target.value)} placeholder="예: 강남역 한우집" />
              </div>
            </div>
            <div className="bf-modal-footer">
              <button className="bf-modal-cancel" onClick={() => setShowConfirmMeeting(null)}>취소</button>
              <button className="bf-modal-submit" onClick={handleConfirmMeeting} disabled={!confirmDate.trim() || !confirmLocation.trim()}>확정하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Fee */}
      {showCreateFee && (
        <div className="bf-modal-backdrop" onClick={() => setShowCreateFee(false)}>
          <div className="bf-modal" onClick={e => e.stopPropagation()}>
            <div className="bf-modal-header">
              <h3>회비 등록</h3>
              <button className="bf-modal-close" onClick={() => setShowCreateFee(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bf-modal-body">
              <div className="bf-modal-field">
                <label>금액 (원) *</label>
                <input type="number" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} placeholder="예: 50000" />
              </div>
              <div className="bf-modal-field">
                <label>설명</label>
                <input value={feeDesc} onChange={e => setFeeDesc(e.target.value)} placeholder="예: 2026년 1분기 회비" />
              </div>
              <div className="bf-modal-field">
                <label>납부 기한</label>
                <input type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} />
              </div>
            </div>
            <div className="bf-modal-footer">
              <button className="bf-modal-cancel" onClick={() => setShowCreateFee(false)}>취소</button>
              <button className="bf-modal-submit" onClick={handleCreateFee} disabled={!feeAmount}>등록하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Members */}
      {showInvite && (
        <div className="bf-modal-backdrop" onClick={() => setShowInvite(false)}>
          <div className="bf-modal" onClick={e => e.stopPropagation()}>
            <div className="bf-modal-header">
              <h3>멤버 초대</h3>
              <button className="bf-modal-close" onClick={() => setShowInvite(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="bf-modal-body">
              <div className="bf-modal-field">
                <input value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} placeholder="이름 또는 아이디로 검색" />
              </div>
              <div className="bf-invite-list">
                {filteredClassmates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>초대 가능한 동창이 없습니다</div>
                )}
                {filteredClassmates.map(c => (
                  <div key={c.userId} className="bf-invite-row">
                    <div className="bf-invite-row-avatar">{c.name[0]}</div>
                    <div className="bf-invite-row-name">{c.name} ({c.userId})</div>
                    <button className="bf-invite-row-btn" onClick={() => handleInvite(c.userId)}>초대</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="bf-toast">{toast}</div>}
    </div>
  );
}
