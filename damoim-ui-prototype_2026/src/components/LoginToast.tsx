import { useState, useEffect, useCallback } from 'react';
import './LoginToast.css';

export interface LoginToastData {
  userId: string;
  name: string;
  profileImageUrl?: string;
}

interface LoginToastProps {
  data: LoginToastData;
  offsetIndex?: number;
  onDone: () => void;
}

export default function LoginToast({ data, offsetIndex = 0, onDone }: LoginToastProps) {
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

  return (
    <div
      className={`login-toast ${phase}`}
      style={{
        '--toast-bottom': `${bottomOffset}px`,
        '--toast-hide': `${-100 - offsetIndex * 80}px`,
      } as React.CSSProperties}
    >
      <div className="login-toast-avatar">
        {imgSrc ? <img src={imgSrc} alt="" /> : data.name[0]}
      </div>
      <div className="login-toast-text">
        <div className="login-toast-name">{data.name}</div>
        <div className="login-toast-msg">님이 접속했습니다</div>
      </div>
      <div className="login-toast-indicator" />
    </div>
  );
}
