package com.ourclass.backend.service;

import com.ourclass.backend.dto.MessageRequest;
import com.ourclass.backend.dto.MessageResponse;
import com.ourclass.backend.entity.Message;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.repository.MessageRepository;
import com.ourclass.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public MessageResponse sendMessage(String senderId, MessageRequest request) {
        User sender = userRepository.findByUserId(senderId)
                .orElseThrow(() -> new RuntimeException("발신자를 찾을 수 없습니다."));

        User receiver = userRepository.findByUserId(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("수신자를 찾을 수 없습니다."));

        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .build();

        Message savedMessage = messageRepository.save(message);

        log.info("쪽지 전송: {} -> {}", senderId, request.getReceiverId());

        // 알림 전송
        notificationService.createAndSend(
                request.getReceiverId(),
                senderId,
                sender.getName(),
                "MESSAGE",
                sender.getName() + "님이 쪽지를 보냈습니다",
                savedMessage.getId()
        );

        return toMessageResponse(savedMessage);
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getReceivedMessages(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<Message> messages = messageRepository.findByReceiverAndDeletedByReceiverFalseOrderBySentAtDesc(user);

        return messages.stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getSentMessages(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<Message> messages = messageRepository.findBySenderAndDeletedBySenderFalseOrderBySentAtDesc(user);

        return messages.stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("쪽지를 찾을 수 없습니다."));

        // 수신자만 읽음 처리 가능
        if (!message.getReceiver().getUserId().equals(userId)) {
            throw new RuntimeException("권한이 없습니다.");
        }

        if (message.getReadAt() == null) {
            message.setReadAt(LocalDateTime.now());
            messageRepository.save(message);
        }
    }

    @Transactional
    public void deleteMessage(Long messageId, String userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("쪽지를 찾을 수 없습니다."));

        // 발신자가 삭제하는 경우
        if (message.getSender().getUserId().equals(userId)) {
            message.setDeletedBySender(true);
        }
        // 수신자가 삭제하는 경우
        else if (message.getReceiver().getUserId().equals(userId)) {
            message.setDeletedByReceiver(true);
        } else {
            throw new RuntimeException("권한이 없습니다.");
        }

        messageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        return messageRepository.countByReceiverAndReadAtIsNullAndDeletedByReceiverFalse(user);
    }

    private MessageResponse toMessageResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .sender(MessageResponse.UserInfo.builder()
                        .userId(message.getSender().getUserId())
                        .name(message.getSender().getName())
                        .profileImageUrl(message.getSender().getProfileImageUrl())
                        .build())
                .receiver(MessageResponse.UserInfo.builder()
                        .userId(message.getReceiver().getUserId())
                        .name(message.getReceiver().getName())
                        .profileImageUrl(message.getReceiver().getProfileImageUrl())
                        .build())
                .content(message.getContent())
                .sentAt(message.getSentAt())
                .readAt(message.getReadAt())
                .read(message.getReadAt() != null)
                .build();
    }
}
