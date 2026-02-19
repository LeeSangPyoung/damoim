import React from 'react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  type?: 'success' | 'confirm' | 'error';
  confirmText?: string;
  cancelText?: string;
  onCancel?: () => void;
}

export default function ConfirmationModal({
  message,
  onConfirm,
  type = 'success',
  confirmText,
  cancelText = '취소',
  onCancel,
}: ConfirmationModalProps) {
  const isConfirm = type === 'confirm';
  const isError = type === 'error';

  const handleBackdropClick = () => {
    if (isConfirm && onCancel) {
      onCancel();
    } else {
      onConfirm();
    }
  };

  return (
    <div className="confirmation-modal-backdrop" onClick={handleBackdropClick}>
      <div className="confirmation-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className={`confirmation-modal-icon ${isError ? 'error' : isConfirm ? 'confirm' : 'success'}`}>
          {isError ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
          ) : isConfirm ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          )}
        </div>
        <div className="confirmation-modal-message">{message}</div>
        <div className={`confirmation-modal-btns ${isConfirm ? 'two-btn' : ''}`}>
          {isConfirm && onCancel && (
            <button className="confirmation-modal-btn cancel" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button
            className={`confirmation-modal-btn ${isError ? 'error' : isConfirm ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmText || (isConfirm ? '확인' : isError ? '닫기' : '확인')}
          </button>
        </div>
      </div>
    </div>
  );
}
