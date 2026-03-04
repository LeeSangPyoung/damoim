import React from 'react';

const S: React.CSSProperties = {
  display: 'inline-block',
  width: '18px',
  height: '18px',
  verticalAlign: 'middle',
  marginRight: '2px',
};

const c = '#4b5563'; // gray-600 stroke
const w = '1.8';     // stroke width

function I({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ ...S, ...style }}>
      {children}
    </svg>
  );
}

// 음식점 — 포크+나이프
const Restaurant = () => (
  <I>
    <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 002-2V2" />
    <path d="M6 2v20" />
    <path d="M19 2c0 0-2 2-2 5s2 5 2 5v10" />
  </I>
);

// 카페 — 커피컵
const Cafe = () => (
  <I>
    <path d="M17 8h1a4 4 0 010 8h-1" />
    <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </I>
);

// 주점/바 — 와인잔
const Bar = () => (
  <I>
    <path d="M8 22h8" />
    <path d="M12 11v11" />
    <path d="M20 2H4l2.5 9a5 5 0 005 3.5h1a5 5 0 005-3.5L20 2z" />
  </I>
);

// 뷰티/미용 — 가위
const Beauty = () => (
  <I>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </I>
);

// 건강/의료 — 하트 + 십자
const Health = () => (
  <I>
    <path d="M19.5 12.572l-7.5 7.428-7.5-7.428A5 5 0 0112 6.006a5 5 0 017.5 6.566z" />
    <path d="M12 10v4" stroke={c} strokeWidth="1.5" />
    <path d="M10 12h4" stroke={c} strokeWidth="1.5" />
  </I>
);

// 교육 — 책
const Education = () => (
  <I>
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
  </I>
);

// 생활서비스 — 렌치
const Lifestyle = () => (
  <I>
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </I>
);

// 쇼핑/유통 — 쇼핑백
const Shopping = () => (
  <I>
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </I>
);

// 자동차
const Car = () => (
  <I>
    <path d="M5 17h14v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" />
    <path d="M5 17l1.5-6A2 2 0 018.44 9.5h7.12A2 2 0 0117.5 11L19 17" />
    <circle cx="7.5" cy="17" r="1" fill={c} />
    <circle cx="16.5" cy="17" r="1" fill={c} />
    <line x1="5" y1="13" x2="19" y2="13" strokeWidth="1.2" />
  </I>
);

// IT/전자 — 모니터
const IT = () => (
  <I>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </I>
);

// 기타 — 가게
const Etc = () => (
  <I>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </I>
);

export const CategoryIconMap: Record<string, React.ReactNode> = {
  '음식점': <Restaurant />,
  '카페/디저트': <Cafe />,
  '주점/바': <Bar />,
  '뷰티/미용': <Beauty />,
  '건강/의료': <Health />,
  '교육': <Education />,
  '생활서비스': <Lifestyle />,
  '쇼핑/유통': <Shopping />,
  '자동차': <Car />,
  'IT/전자': <IT />,
  '기타': <Etc />,
};

export function CategoryIcon({ category, size }: { category: string; size?: number }) {
  const icon = CategoryIconMap[category];
  if (!icon) return <Etc />;
  if (size) {
    return <span style={{ display: 'inline-flex', transform: `scale(${size / 18})`, transformOrigin: 'center' }}>{icon}</span>;
  }
  return <>{icon}</>;
}
