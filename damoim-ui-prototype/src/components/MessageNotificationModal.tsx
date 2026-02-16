import { useNavigate } from 'react-router-dom';
import { MessageResponse } from '../api/message';
import './MessageNotificationModal.css';

interface MessageNotificationModalProps {
  message: MessageResponse;
  onClose: () => void;
}

export default function MessageNotificationModal({
  message,
  onClose,
}: MessageNotificationModalProps) {
  const navigate = useNavigate();

  const handleGoToMessages = () => {
    navigate('/messages');
    onClose();
  };

  return (
    <div className="message-notification-backdrop" onClick={onClose}>
      <div className="message-notification-box" onClick={(e) => e.stopPropagation()}>
        <div className="message-notification-header">
          <div className="message-notification-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
          <h3>새로운 쪽지가 도착했습니다</h3>
        </div>

        <div className="message-notification-body">
          <div className="message-sender">
            <strong>보낸 사람:</strong> {message.sender.name} ({message.sender.userId})
          </div>
          <div className="message-content">
            {message.content}
          </div>
        </div>

        <div className="message-notification-actions">
          <button className="close-notification-btn" onClick={onClose}>
            닫기
          </button>
          <button className="goto-messages-btn" onClick={handleGoToMessages}>
            쪽지함으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
