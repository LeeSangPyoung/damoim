import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthData } from '../utils/auth';
import { userAPI } from '../api/user';
import { chatAPI } from '../api/chat';
import { friendAPI, FriendshipStatus } from '../api/friend';
import { alumniShopAPI, ShopResponse, ShopReviewResponse, SHOP_CATEGORIES, MAIN_CATEGORIES } from '../api/alumniShop';
import { CategoryIcon } from '../components/CategoryIcons';
import ComposeMessageModal from '../components/ComposeMessageModal';
import './AlumniShop.css';

// 시간 옵션 생성 (00:00 ~ 23:30, 30분 단위)
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'] as const;

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHoursData {
  mode: 'uniform' | 'perDay';
  uniform: { open: string; close: string };
  days: Record<string, DayHours>;
  hasBreakTime: boolean;
  breakStart: string;
  breakEnd: string;
  holiday: 'same' | 'closed' | 'custom';
  holidayOpen: string;
  holidayClose: string;
}

const DEFAULT_DAY: DayHours = { open: '09:00', close: '22:00', closed: false };

const DEFAULT_HOURS: BusinessHoursData = {
  mode: 'uniform',
  uniform: { open: '09:00', close: '22:00' },
  days: Object.fromEntries(DAY_NAMES.map(d => [d, { ...DEFAULT_DAY }])),
  hasBreakTime: false,
  breakStart: '14:00',
  breakEnd: '15:00',
  holiday: 'same',
  holidayOpen: '10:00',
  holidayClose: '18:00',
};

function formatBusinessHours(h: BusinessHoursData): string {
  const parts: string[] = [];

  if (h.mode === 'uniform') {
    parts.push(`매일 ${h.uniform.open}~${h.uniform.close}`);
  } else {
    // 같은 시간대끼리 그룹핑
    const groups: { days: string[]; open: string; close: string; closed: boolean }[] = [];
    for (const day of DAY_NAMES) {
      const d = h.days[day];
      const last = groups[groups.length - 1];
      if (last && last.closed === d.closed && last.open === d.open && last.close === d.close) {
        last.days.push(day);
      } else {
        groups.push({ days: [day], open: d.open, close: d.close, closed: d.closed });
      }
    }
    for (const g of groups) {
      const label = g.days.length === 1 ? g.days[0] :
        g.days.length === DAY_NAMES.length ? '매일' :
        `${g.days[0]}~${g.days[g.days.length - 1]}`;
      parts.push(g.closed ? `${label} 휴무` : `${label} ${g.open}~${g.close}`);
    }
  }

  if (h.hasBreakTime) {
    parts.push(`브레이크 ${h.breakStart}~${h.breakEnd}`);
  }

  if (h.holiday === 'closed') {
    parts.push('공휴일 휴무');
  } else if (h.holiday === 'custom') {
    parts.push(`공휴일 ${h.holidayOpen}~${h.holidayClose}`);
  }

  return parts.join(' / ');
}

function parseBusinessHours(str: string): BusinessHoursData {
  if (!str) return JSON.parse(JSON.stringify(DEFAULT_HOURS));

  const result: BusinessHoursData = JSON.parse(JSON.stringify(DEFAULT_HOURS));
  const parts = str.split(' / ');

  for (const part of parts) {
    const t = part.trim();

    if (t.startsWith('브레이크')) {
      const times = t.replace('브레이크 ', '').split('~');
      if (times.length === 2) {
        result.hasBreakTime = true;
        result.breakStart = times[0].trim();
        result.breakEnd = times[1].trim();
      }
    } else if (t === '공휴일 휴무') {
      result.holiday = 'closed';
    } else if (t.startsWith('공휴일')) {
      const times = t.replace('공휴일 ', '').split('~');
      if (times.length === 2) {
        result.holiday = 'custom';
        result.holidayOpen = times[0].trim();
        result.holidayClose = times[1].trim();
      }
    } else if (t.startsWith('매일')) {
      const times = t.replace('매일 ', '').split('~');
      if (times.length === 2) {
        result.mode = 'uniform';
        result.uniform = { open: times[0].trim(), close: times[1].trim() };
      }
    } else if (t.startsWith('평일')) {
      // 이전 포맷 호환
      result.mode = 'perDay';
      const times = t.replace('평일 ', '').split('~');
      if (times.length === 2) {
        for (const d of ['월','화','수','목','금']) {
          result.days[d] = { open: times[0].trim(), close: times[1].trim(), closed: false };
        }
      }
    } else if (t === '주말 휴무') {
      result.mode = 'perDay';
      for (const d of ['토','일']) result.days[d] = { ...result.days[d], closed: true };
    } else if (t.startsWith('주말')) {
      result.mode = 'perDay';
      const times = t.replace('주말 ', '').split('~');
      if (times.length === 2) {
        for (const d of ['토','일']) {
          result.days[d] = { open: times[0].trim(), close: times[1].trim(), closed: false };
        }
      }
    } else {
      // 요일별 포맷: "월 09:00~22:00" or "월~금 09:00~22:00" or "수 휴무"
      result.mode = 'perDay';
      const match = t.match(/^([월화수목금토일])(?:~([월화수목금토일]))?\s+(휴무|(\d{2}:\d{2})~(\d{2}:\d{2}))$/);
      if (match) {
        const startDay = match[1];
        const endDay = match[2] || startDay;
        const isClosed = match[3] === '휴무';
        const open = match[4] || '09:00';
        const close = match[5] || '22:00';
        const si = DAY_NAMES.indexOf(startDay as any);
        const ei = DAY_NAMES.indexOf(endDay as any);
        if (si >= 0 && ei >= 0) {
          for (let i = si; i <= ei; i++) {
            result.days[DAY_NAMES[i]] = { open, close, closed: isClosed };
          }
        }
      }
    }
  }

  return result;
}

// 전화번호 자동 포맷 (02-xxxx-xxxx / 0xx-xxxx-xxxx / 010-xxxx-xxxx)
function formatPhone(value: string): string {
  const nums = value.replace(/[^0-9]/g, '');
  if (nums.startsWith('02')) {
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 2)}-${nums.slice(2)}`;
    return `${nums.slice(0, 2)}-${nums.slice(2, 6)}-${nums.slice(6, 10)}`;
  }
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
}

export default function AlumniShop() {
  const { user } = getAuthData();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [shops, setShops] = useState<ShopResponse[]>([]);
  const [selectedShop, setSelectedShop] = useState<ShopResponse | null>(null);
  const [category, setCategory] = useState('전체');
  const [subCategoryFilter, setSubCategoryFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');

  // 학교 필터 (체크박스 형태, 기본 모두 체크)
  interface UniqueSchool { schoolCode: string; schoolName: string; graduationYear: string; label: string; }
  const [mySchools, setMySchools] = useState<UniqueSchool[]>([]);
  const [checkedSchoolCodes, setCheckedSchoolCodes] = useState<Set<string>>(new Set());

  // 상세 뷰: 사장님 인터랙션
  const [messageTarget, setMessageTarget] = useState<{ userId: string; name: string } | null>(null);
  const [ownerFriendStatus, setOwnerFriendStatus] = useState<FriendshipStatus>({ status: 'NONE' });

  // 후기 (보기 전용 - 작성은 찐모임에서만 가능)
  const [reviews, setReviews] = useState<ShopReviewResponse[]>([]);

  // 등록 모달
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopResponse | null>(null);
  const [formData, setFormData] = useState({
    shopName: '',
    category: '음식점',
    subCategory: '한식',
    description: '',
    address: '',
    detailAddress: '',
    phone: '',
    businessHours: '',
    imageUrl: '',
  });
  const [hoursData, setHoursData] = useState<BusinessHoursData>({ ...DEFAULT_HOURS });

  // 학교 목록 로드
  useEffect(() => {
    const loadSchools = async () => {
      if (!user) return;
      try {
        const profile = await userAPI.getProfile(user.userId);
        const seen = new Set<string>();
        const schools: UniqueSchool[] = [];
        const allCodes = new Set<string>();
        for (const s of profile.schools) {
          const code = s.schoolCode || '';
          // 학교명+졸업연도 기준으로 중복 제거
          const key = `${s.schoolName}_${s.graduationYear}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const shortName = s.schoolName
            .replace('초등학교', '초').replace('중학교', '중').replace('고등학교', '고');
          schools.push({
            schoolCode: code,
            schoolName: s.schoolName,
            graduationYear: s.graduationYear,
            label: `${shortName}(${s.graduationYear})`,
          });
          if (code) allCodes.add(code);
        }
        setMySchools(schools);
        setCheckedSchoolCodes(allCodes); // 기본: 모두 체크
      } catch (e) {
        console.error('학교 목록 로드 실패:', e);
      }
    };
    loadSchools();
  }, [user?.userId]);

  // 학교 필터 변경 시 가게 목록 재로드
  useEffect(() => {
    if (user && checkedSchoolCodes.size > 0) {
      loadShops();
    }
  }, [checkedSchoolCodes]);

  const loadShops = async () => {
    if (!user) return;
    try {
      // 모든 학교가 체크되어 있으면 파라미터 없이, 아니면 체크된 학교 코드만 전송
      const allChecked = mySchools.length > 0 && mySchools.every(s => checkedSchoolCodes.has(s.schoolCode));
      const codes = allChecked ? undefined : Array.from(checkedSchoolCodes).join(',');
      const data = await alumniShopAPI.getShops(user.userId, codes);
      setShops(data);
    } catch (e) {
      console.error('가게 목록 로드 실패:', e);
    }
  };

  const toggleSchoolCheck = (schoolCode: string) => {
    setCheckedSchoolCodes(prev => {
      const next = new Set(prev);
      if (next.has(schoolCode)) {
        // 최소 1개는 체크되어야 함
        if (next.size > 1) next.delete(schoolCode);
      } else {
        next.add(schoolCode);
      }
      return next;
    });
  };

  const toggleAllSchools = () => {
    const allChecked = mySchools.every(s => checkedSchoolCodes.has(s.schoolCode));
    if (allChecked) return; // 이미 모두 체크면 무시
    setCheckedSchoolCodes(new Set(mySchools.map(s => s.schoolCode)));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // 필터링
  const filteredShops = shops.filter(shop => {
    if (category !== '전체' && shop.category !== category) return false;
    if (subCategoryFilter !== '전체' && shop.subCategory !== subCategoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return shop.shopName.toLowerCase().includes(q) ||
        shop.address.toLowerCase().includes(q) ||
        shop.ownerName.toLowerCase().includes(q);
    }
    return true;
  });

  // 가게 등록/수정
  const handleSubmitShop = async () => {
    if (!user) return;
    if (!formData.shopName.trim() || !formData.address.trim()) {
      showToast('가게 이름과 주소는 필수입니다');
      return;
    }

    const submitData = { ...formData, businessHours: formatBusinessHours(hoursData) };

    try {
      if (editingShop) {
        await alumniShopAPI.updateShop(editingShop.id, user.userId, submitData);
        showToast('가게 정보가 수정되었습니다');
      } else {
        await alumniShopAPI.createShop(user.userId, submitData);
        showToast('가게가 등록되었습니다!');
      }
      setShowCreateModal(false);
      setEditingShop(null);
      resetForm();
      loadShops();
    } catch (e: any) {
      showToast(e?.response?.data?.error || '저장에 실패했습니다');
    }
  };

  const resetForm = () => {
    setFormData({
      shopName: '', category: '음식점', subCategory: '한식', description: '', address: '',
      detailAddress: '', phone: '', businessHours: '',
      imageUrl: '',
    });
    setHoursData({ ...DEFAULT_HOURS });
  };

  const handleEditShop = (shop: ShopResponse) => {
    setEditingShop(shop);
    setFormData({
      shopName: shop.shopName,
      category: shop.category,
      subCategory: shop.subCategory || '기타',
      description: shop.description || '',
      address: shop.address,
      detailAddress: shop.detailAddress || '',
      phone: shop.phone || '',
      businessHours: shop.businessHours || '',
      imageUrl: shop.imageUrl || '',
    });
    setHoursData(parseBusinessHours(shop.businessHours || ''));
    setShowCreateModal(true);
  };

  const handleDeleteShop = async (shopId: number) => {
    if (!user || !window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await alumniShopAPI.deleteShop(shopId, user.userId);
      showToast('가게가 삭제되었습니다');
      setView('list');
      loadShops();
    } catch (e: any) {
      showToast(e?.response?.data?.error || '삭제에 실패했습니다');
    }
  };

  // 상세보기
  const handleSelectShop = async (shop: ShopResponse) => {
    setSelectedShop(shop);
    setView('detail');
    setReviews([]);
    // 사장님 친구 상태 + 후기 병렬 로드
    const promises: Promise<void>[] = [
      alumniShopAPI.getReviews(shop.id).then(r => setReviews(r)).catch(() => {}),
    ];
    if (user && shop.ownerUserId !== user.userId) {
      promises.push(
        friendAPI.getStatus(user.userId, shop.ownerUserId)
          .then(status => setOwnerFriendStatus(status))
          .catch(() => setOwnerFriendStatus({ status: 'NONE' }))
      );
    }
    await Promise.all(promises);
  };

  // 사장님에게 채팅 시작
  const handleStartChatWithOwner = async () => {
    if (!user || !selectedShop) return;
    try {
      const data = await chatAPI.createOrGetRoom(user.userId, selectedShop.ownerUserId);
      navigate(`/chat?roomId=${data.roomId}`);
    } catch (e) {
      showToast('채팅방 생성에 실패했습니다');
    }
  };

  // 사장님에게 친구 요청
  const handleSendFriendRequest = async () => {
    if (!user || !selectedShop) return;
    try {
      await friendAPI.sendRequest(user.userId, selectedShop.ownerUserId);
      setOwnerFriendStatus({ status: 'SENT' });
      showToast(`${selectedShop.ownerName}님에게 친구 요청을 보냈습니다`);
    } catch (e: any) {
      showToast(e?.response?.data?.error || '친구 요청에 실패했습니다');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await alumniShopAPI.uploadImage(file);
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      showToast('이미지 업로드에 실패했습니다');
    }
  };

  const apiBaseUrl = 'http://localhost:8080';
  const getImageSrc = (url?: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
  };

  // === 목록 뷰 ===
  if (view === 'list') {
    return (
      <div className="shop-container">
        <div className="shop-header">
          <h2>동창 가게</h2>
          <div className="shop-header-actions">
            <button className="shop-btn-primary" onClick={() => { resetForm(); setEditingShop(null); setShowCreateModal(true); }}>
              + 가게 등록
            </button>
          </div>
        </div>

        {/* 학교 필터 (체크박스 태그) */}
        {mySchools.length > 0 && (
          <div className="shop-school-filter">
            <span className="shop-school-filter-label">내 학교</span>
            {mySchools.length > 1 && (
              <button
                className={`shop-school-tag ${mySchools.every(s => checkedSchoolCodes.has(s.schoolCode)) ? 'active' : ''}`}
                onClick={toggleAllSchools}
              >
                <span className="shop-school-tag-check">
                  {mySchools.every(s => checkedSchoolCodes.has(s.schoolCode)) ? '✓' : ''}
                </span>
                전체
              </button>
            )}
            {mySchools.map(school => (
              <button
                key={school.schoolCode + school.graduationYear}
                className={`shop-school-tag ${checkedSchoolCodes.has(school.schoolCode) ? 'active' : ''}`}
                onClick={() => toggleSchoolCheck(school.schoolCode)}
              >
                <span className="shop-school-tag-check">
                  {checkedSchoolCodes.has(school.schoolCode) ? '✓' : ''}
                </span>
                {school.label}
              </button>
            ))}
          </div>
        )}

        <div className="shop-filters">
          <div className="shop-category-row">
            <button
              className={`shop-category-btn ${category === '전체' ? 'active' : ''}`}
              onClick={() => { setCategory('전체'); setSubCategoryFilter('전체'); }}
            >전체</button>
            {MAIN_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`shop-category-btn ${category === cat ? 'active' : ''}`}
                onClick={() => { setCategory(cat); setSubCategoryFilter('전체'); }}
              >
                <CategoryIcon category={cat} /> {cat}
              </button>
            ))}
          </div>
          {category !== '전체' && SHOP_CATEGORIES[category] && (
            <div className="shop-category-row sub">
              <button
                className={`shop-subcategory-btn ${subCategoryFilter === '전체' ? 'active' : ''}`}
                onClick={() => setSubCategoryFilter('전체')}
              >전체</button>
              {SHOP_CATEGORIES[category].map(sub => (
                <button
                  key={sub}
                  className={`shop-subcategory-btn ${subCategoryFilter === sub ? 'active' : ''}`}
                  onClick={() => setSubCategoryFilter(sub)}
                >{sub}</button>
              ))}
            </div>
          )}
          <div className="shop-search-bar">
            <svg className="shop-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              placeholder="가게명, 주소, 사장님 검색"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredShops.length === 0 ? (
          <div className="shop-empty">
            <div className="shop-empty-icon">🏪</div>
            <h3>{shops.length === 0 ? '아직 등록된 가게가 없어요' : '검색 결과가 없어요'}</h3>
            <p>{shops.length === 0 ? '동창이 운영하는 가게를 등록해보세요!' : '다른 카테고리나 검색어로 찾아보세요'}</p>
          </div>
        ) : (
          <div className="shop-card-grid">
            {filteredShops.map(shop => (
              <div key={shop.id} className="shop-card" onClick={() => handleSelectShop(shop)}>
                <div className="shop-card-image">
                  {shop.imageUrl ? (
                    <img src={getImageSrc(shop.imageUrl)} alt={shop.shopName} />
                  ) : (
                    <CategoryIcon category={shop.category} size={48} />
                  )}
                </div>
                <div className="shop-card-body">
                  <span className="shop-card-category"><CategoryIcon category={shop.category} /> {shop.subCategory || shop.category}</span>
                  <div className="shop-card-name">
                    {shop.shopName}
                    {shop.averageRating != null && (
                      <span className="shop-card-rating">★ {shop.averageRating.toFixed(1)}<span className="shop-card-review-count">({shop.reviewCount})</span></span>
                    )}
                  </div>
                  <div className="shop-card-address">{shop.address}{shop.detailAddress ? ` ${shop.detailAddress}` : ''}</div>
                  <div className="shop-card-footer">
                    <div className="shop-card-owner">
                      <strong>{shop.ownerName}</strong> · {(shop.ownerSchools || []).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 등록/수정 모달 */}
        {showCreateModal && (
          <div className="shop-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="shop-modal" onClick={e => e.stopPropagation()}>
              <div className="shop-modal-header">
                <h3>{editingShop ? '가게 수정' : '가게 등록'}</h3>
                <button className="shop-modal-close" onClick={() => setShowCreateModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="shop-modal-body">
                <div className="shop-form-group">
                  <label>가게 이름 *</label>
                  <input placeholder="예: 맛있는 한식집" value={formData.shopName} onChange={e => setFormData({ ...formData, shopName: e.target.value })} />
                </div>
                <div className="shop-form-group">
                  <label>업종 (대분류) *</label>
                  <select value={formData.category} onChange={e => {
                    const newCat = e.target.value;
                    const subs = SHOP_CATEGORIES[newCat] || ['기타'];
                    setFormData({ ...formData, category: newCat, subCategory: subs[0] });
                  }}>
                    {MAIN_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="shop-form-group">
                  <label>업종 (중분류)</label>
                  <select value={formData.subCategory} onChange={e => setFormData({ ...formData, subCategory: e.target.value })}>
                    {(SHOP_CATEGORIES[formData.category] || ['기타']).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="shop-form-group">
                  <label>주소 *</label>
                  <input placeholder="예: 서울시 강남구 역삼동 123-45" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="shop-form-group">
                  <label>상세주소</label>
                  <input placeholder="예: 2층" value={formData.detailAddress} onChange={e => setFormData({ ...formData, detailAddress: e.target.value })} />
                </div>
                <div className="shop-form-group">
                  <label>전화번호</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="02-1234-5678"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    maxLength={13}
                  />
                </div>
                <div className="shop-form-group">
                  <label>영업시간</label>
                  <div className="shop-hours-picker">
                    {/* 모드 선택 */}
                    <div className="shop-hours-mode">
                      <button type="button" className={`shop-hours-mode-btn ${hoursData.mode === 'uniform' ? 'active' : ''}`}
                        onClick={() => setHoursData({ ...hoursData, mode: 'uniform' })}>매일 동일</button>
                      <button type="button" className={`shop-hours-mode-btn ${hoursData.mode === 'perDay' ? 'active' : ''}`}
                        onClick={() => setHoursData({ ...hoursData, mode: 'perDay' })}>요일별 설정</button>
                    </div>

                    {hoursData.mode === 'uniform' ? (
                      <div className="shop-hours-row">
                        <span className="shop-hours-label">매일</span>
                        <select value={hoursData.uniform.open} onChange={e => setHoursData({ ...hoursData, uniform: { ...hoursData.uniform, open: e.target.value } })}>
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="shop-hours-sep">~</span>
                        <select value={hoursData.uniform.close} onChange={e => setHoursData({ ...hoursData, uniform: { ...hoursData.uniform, close: e.target.value } })}>
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="shop-hours-days">
                        {DAY_NAMES.map(day => {
                          const d = hoursData.days[day];
                          const isWeekend = day === '토' || day === '일';
                          return (
                            <div key={day} className={`shop-hours-row ${d.closed ? 'closed' : ''}`}>
                              <span className={`shop-hours-label ${isWeekend ? 'weekend' : ''}`}>{day}</span>
                              {d.closed ? (
                                <span className="shop-hours-closed-text">휴무</span>
                              ) : (
                                <>
                                  <select value={d.open} onChange={e => setHoursData({ ...hoursData, days: { ...hoursData.days, [day]: { ...d, open: e.target.value } } })}>
                                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <span className="shop-hours-sep">~</span>
                                  <select value={d.close} onChange={e => setHoursData({ ...hoursData, days: { ...hoursData.days, [day]: { ...d, close: e.target.value } } })}>
                                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </>
                              )}
                              <label className="shop-hours-closed-toggle">
                                <input type="checkbox" checked={d.closed} onChange={e => setHoursData({ ...hoursData, days: { ...hoursData.days, [day]: { ...d, closed: e.target.checked } } })} />
                                휴무
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 브레이크 타임 */}
                    <div className="shop-hours-section">
                      <label className="shop-hours-section-toggle">
                        <input type="checkbox" checked={hoursData.hasBreakTime} onChange={e => setHoursData({ ...hoursData, hasBreakTime: e.target.checked })} />
                        브레이크 타임
                      </label>
                      {hoursData.hasBreakTime && (
                        <div className="shop-hours-row">
                          <span className="shop-hours-label"></span>
                          <select value={hoursData.breakStart} onChange={e => setHoursData({ ...hoursData, breakStart: e.target.value })}>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="shop-hours-sep">~</span>
                          <select value={hoursData.breakEnd} onChange={e => setHoursData({ ...hoursData, breakEnd: e.target.value })}>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 공휴일 설정 */}
                    <div className="shop-hours-section">
                      <div className="shop-hours-row">
                        <span className="shop-hours-label" style={{ minWidth: 48 }}>공휴일</span>
                        <select className="shop-hours-holiday-select" value={hoursData.holiday} onChange={e => setHoursData({ ...hoursData, holiday: e.target.value as any })}>
                          <option value="same">정상 영업</option>
                          <option value="closed">휴무</option>
                          <option value="custom">별도 시간</option>
                        </select>
                      </div>
                      {hoursData.holiday === 'custom' && (
                        <div className="shop-hours-row">
                          <span className="shop-hours-label" style={{ minWidth: 48 }}></span>
                          <select value={hoursData.holidayOpen} onChange={e => setHoursData({ ...hoursData, holidayOpen: e.target.value })}>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="shop-hours-sep">~</span>
                          <select value={hoursData.holidayClose} onChange={e => setHoursData({ ...hoursData, holidayClose: e.target.value })}>
                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shop-form-group">
                  <label>가게 소개</label>
                  <textarea placeholder="동창들에게 가게를 소개해주세요!" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="shop-form-group">
                  <label>대표 이미지</label>
                  <div className="shop-form-image-upload">
                    <div className="shop-form-image-preview">
                      {formData.imageUrl ? (
                        <img src={getImageSrc(formData.imageUrl)} alt="미리보기" />
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '24px' }}>📷</span>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                  </div>
                </div>
              </div>
              <div className="shop-modal-footer">
                <button className="shop-btn-secondary" onClick={() => setShowCreateModal(false)}>취소</button>
                <button className="shop-btn-primary" onClick={handleSubmitShop}>{editingShop ? '수정하기' : '등록하기'}</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="shop-toast">{toast}</div>}
      </div>
    );
  }

  // === 상세 뷰 ===
  if (view === 'detail' && selectedShop) {
    const isOwner = user?.userId === selectedShop.ownerUserId;

    return (
      <div className="shop-container">
        <div className="shop-detail">
          <button className="shop-detail-back" onClick={() => { setView('list'); setSelectedShop(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
            목록으로
          </button>

          <div className="shop-detail-card">
            <div className="shop-detail-image">
              {selectedShop.imageUrl ? (
                <img src={getImageSrc(selectedShop.imageUrl)} alt={selectedShop.shopName} />
              ) : (
                <CategoryIcon category={selectedShop.category} size={48} />
              )}
            </div>

            <div className="shop-detail-body">
              <div className="shop-detail-header">
                <div>
                  <span className="shop-detail-name">{selectedShop.shopName}</span>
                  <span className="shop-detail-category"><CategoryIcon category={selectedShop.category} /> {selectedShop.category}{selectedShop.subCategory ? ` > ${selectedShop.subCategory}` : ''}</span>
                </div>
              </div>

              <div className="shop-detail-owner">
                <div className="shop-detail-owner-avatar">
                  {selectedShop.ownerProfileImageUrl ? (
                    <img src={getImageSrc(selectedShop.ownerProfileImageUrl)} alt="" />
                  ) : selectedShop.ownerName[0]}
                </div>
                <div className="shop-detail-owner-info">
                  <strong>{selectedShop.ownerName}</strong> · {(selectedShop.ownerSchools || []).join(', ')}
                </div>
                {!isOwner && (
                  <div className="shop-detail-owner-actions">
                    <button className="shop-owner-action-btn" onClick={handleStartChatWithOwner} title="채팅">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button className="shop-owner-action-btn" onClick={() => setMessageTarget({ userId: selectedShop.ownerUserId, name: selectedShop.ownerName })} title="쪽지">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </button>
                    {ownerFriendStatus.status === 'FRIEND' ? (
                      <button className="shop-owner-action-btn shop-owner-action-done" title="친구">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                    ) : ownerFriendStatus.status === 'SENT' ? (
                      <button className="shop-owner-action-btn shop-owner-action-pending" title="요청됨">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      </button>
                    ) : (
                      <button className="shop-owner-action-btn" onClick={handleSendFriendRequest} title="친구 추가">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="shop-detail-info">
                <div className="shop-detail-info-item">
                  <span className="shop-detail-info-icon">📍</span>
                  {selectedShop.address}{selectedShop.detailAddress ? ` ${selectedShop.detailAddress}` : ''}
                </div>
                {selectedShop.phone && (
                  <div className="shop-detail-info-item">
                    <span className="shop-detail-info-icon">📞</span>
                    {selectedShop.phone}
                  </div>
                )}
                {selectedShop.businessHours && (
                  <div className="shop-detail-info-item">
                    <span className="shop-detail-info-icon">🕐</span>
                    <div className="shop-detail-hours">
                      {selectedShop.businessHours.split(' / ').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedShop.description && (
                <div className="shop-detail-description">{selectedShop.description}</div>
              )}

              {/* 후기 섹션 (보기 전용 - 작성은 찐모임에서만 가능) */}
              <div className="shop-review-section">
                <div className="shop-review-header">
                  <div className="shop-review-header-left">
                    <h4>후기</h4>
                    {selectedShop.averageRating != null && (
                      <span className="shop-review-avg">
                        <span className="shop-review-avg-star">★</span>
                        {selectedShop.averageRating.toFixed(1)}
                        <span className="shop-review-count">({selectedShop.reviewCount})</span>
                      </span>
                    )}
                  </div>
                  <span className="shop-review-notice">찐모임에서 모임 후 작성 가능</span>
                </div>

                {/* 후기 목록 */}
                {reviews.length === 0 ? (
                  <div className="shop-review-empty">아직 후기가 없습니다</div>
                ) : (
                  <div className="shop-review-list">
                    {reviews.map(review => (
                      <div key={review.id} className="shop-review-item">
                        <div className="shop-review-item-header">
                          <div className="shop-review-item-avatar">
                            {review.reviewerProfileImageUrl ? (
                              <img src={getImageSrc(review.reviewerProfileImageUrl)} alt="" />
                            ) : review.reviewerName[0]}
                          </div>
                          <div className="shop-review-item-info">
                            <span className="shop-review-item-name">{review.reviewerName}</span>
                            <span className="shop-review-item-date">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                          <div className="shop-review-item-rating">
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </div>
                        </div>
                        {review.content && <div className="shop-review-item-content">{review.content}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="shop-detail-actions">
                  <button className="shop-btn-secondary" onClick={() => handleEditShop(selectedShop)}>수정</button>
                  <button className="shop-btn-secondary" style={{ color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleDeleteShop(selectedShop.id)}>삭제</button>
                </div>
              )}

            </div>
          </div>
        </div>

        {messageTarget && (
          <ComposeMessageModal
            recipientId={messageTarget.userId}
            recipientName={messageTarget.name}
            onClose={() => setMessageTarget(null)}
            onSent={() => { setMessageTarget(null); showToast('쪽지를 보냈습니다'); }}
          />
        )}

        {toast && <div className="shop-toast">{toast}</div>}
      </div>
    );
  }

  return null;
}
