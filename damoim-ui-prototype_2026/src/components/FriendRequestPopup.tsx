import { NotificationResponse } from '../api/notification';
import './FriendRequestPopup.css';

interface FriendRequestPopupProps {
  notification: NotificationResponse;
  onAccept: (friendshipId: number, senderName: string) => void;
  onReject: (friendshipId: number) => void;
  onClose: () => void;
}

export default function FriendRequestPopup({
  notification,
  onAccept,
  onReject,
  onClose,
}: FriendRequestPopupProps) {
  return (
    <div className="friend-req-popup-backdrop" onClick={onClose}>
      <div className="friend-req-popup-box" onClick={(e) => e.stopPropagation()}>
        <div className="friend-req-popup-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          <h3>친구 요청</h3>
        </div>

        <div className="friend-req-popup-body">
          <div className="friend-req-popup-avatar">
            {notification.senderName[0]}
          </div>
          <div className="friend-req-popup-text">
            <strong>{notification.senderName}</strong>님이<br/>
            친구 요청을 보냈습니다.
          </div>
        </div>

        <div className="friend-req-popup-actions">
          <button
            className="friend-req-reject-btn"
            onClick={() => {
              if (notification.referenceId) onReject(notification.referenceId);
              onClose();
            }}
          >
            거절
          </button>
          <button
            className="friend-req-accept-btn"
            onClick={() => {
              if (notification.referenceId) onAccept(notification.referenceId, notification.senderName);
              onClose();
            }}
          >
            수락
          </button>
        </div>
      </div>
    </div>
  );
}
