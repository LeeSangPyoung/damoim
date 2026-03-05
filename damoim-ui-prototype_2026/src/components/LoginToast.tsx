import { useState, useEffect, useCallback } from 'react';
import './LoginToast.css';

export interface LoginToastData {
  userId: string;
  name: string;
  profileImageUrl?: string;
  type?: 'login' | 'chat';
  message?: string;
}

interface LoginToastProps {
  data: LoginToastData;
  offsetIndex?: number;
  onDone: () => void;
  onClick?: () => void;
}

export default function LoginToast({ data, offsetIndex = 0, onDone, onClick }: LoginToastProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  const stableDone = useCallback(onDone, []);

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('visible'), 50);
    const exitTimer = setTimeout(() => setPhase('exit'), 10000);
    const removeTimer = setTimeout(() => stableDone(), 10500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [stableDone]);

  const apiBaseUrl = (window as any).__API_BASE_URL__ || 'http://localhost:8080';
  const imgSrc = data.profileImageUrl
    ? (data.profileImageUrl.startsWith('http') ? data.profileImageUrl : `${apiBaseUrl}${data.profileImageUrl}`)
    : '';

  const bottomOffset = 30 + offsetIndex * 80;
  const isChat = data.type === 'chat';

  return (
    <div
      className={`login-toast ${phase} ${isChat ? 'login-toast-chat' : ''}`}
      style={{
        '--toast-bottom': `${bottomOffset}px`,
        '--toast-hide': `${-100 - offsetIndex * 80}px`,
        cursor: onClick ? 'pointer' : undefined,
      } as React.CSSProperties}
      onClick={onClick}
    >
      <div className={`login-toast-avatar ${isChat ? 'login-toast-avatar-chat' : ''}`}>
        {isChat ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        ) : imgSrc ? <img src={imgSrc} alt="" /> : data.name[0]}
      </div>
      <div className="login-toast-text">
        <div className="login-toast-name">{data.name}</div>
        <div className="login-toast-msg">
          {isChat ? (data.message || '새 메시지가 도착했습니다') : '님이 접속했습니다'}
        </div>
      </div>
      <div className={`login-toast-indicator ${isChat ? 'login-toast-indicator-chat' : ''}`} />
    </div>
  );
}
