package com.ourclass.backend.service;

import com.ourclass.backend.dto.NotificationResponse;
import com.ourclass.backend.entity.Notification;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.repository.NotificationRepository;
import com.ourclass.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void createAndSend(String recipientUserId, String senderUserId, String senderName,
                               String type, String content, Long referenceId) {
        User recipient = userRepository.findByUserId(recipientUserId).orElse(null);
        if (recipient == null) {
            log.warn("알림 수신자를 찾을 수 없습니다: {}", recipientUserId);
            return;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .senderUserId(senderUserId)
                .senderName(senderName)
                .type(type)
                .content(content)
                .referenceId(referenceId)
                .build();

        Notification saved = notificationRepository.save(notification);

        NotificationResponse response = toResponse(saved);

        // WebSocket으로 실시간 푸시
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + recipientUserId,
                response
        );

        log.info("알림 전송: {} -> {} ({})", senderUserId, recipientUserId, type);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        return notificationRepository.findTop50ByRecipientOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        return notificationRepository.countByRecipientAndReadFalse(user);
    }

    @Transactional
    public void markAsRead(Long notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("알림을 찾을 수 없습니다."));

        if (!notification.getRecipient().getUserId().equals(userId)) {
            throw new RuntimeException("권한이 없습니다.");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        notificationRepository.markAllAsRead(user);
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .senderUserId(notification.getSenderUserId())
                .senderName(notification.getSenderName())
                .type(notification.getType())
                .content(notification.getContent())
                .referenceId(notification.getReferenceId())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
