package com.ourclass.backend.service;

import com.ourclass.backend.dto.ChatMessageResponse;
import com.ourclass.backend.dto.ChatRoomResponse;
import com.ourclass.backend.entity.ChatMessage;
import com.ourclass.backend.entity.ChatRoom;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.repository.ChatMessageRepository;
import com.ourclass.backend.repository.ChatRoomRepository;
import com.ourclass.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Autowired
    private ChatRoomRepository chatRoomRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    // 채팅방 생성 또는 기존 방 반환
    @Transactional
    public ChatRoom getOrCreateRoom(String userId1, String userId2) {
        User user1 = userRepository.findByUserId(userId1)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + userId1));
        User user2 = userRepository.findByUserId(userId2)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + userId2));

        return chatRoomRepository.findByUsers(user1, user2)
                .orElseGet(() -> chatRoomRepository.save(
                        ChatRoom.builder().user1(user1).user2(user2).build()
                ));
    }

    // 내 채팅방 목록
    public List<ChatRoomResponse> getMyChatRooms(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        return chatRoomRepository.findByUser(user).stream()
                .map(room -> {
                    User otherUser = room.getUser1().getUserId().equals(userId) ? room.getUser2() : room.getUser1();
                    long unreadCount = chatMessageRepository.countUnreadMessages(room, user);

                    return ChatRoomResponse.builder()
                            .id(room.getId())
                            .otherUser(ChatRoomResponse.UserInfo.builder()
                                    .userId(otherUser.getUserId())
                                    .name(otherUser.getName())
                                    .profileImageUrl(otherUser.getProfileImageUrl())
                                    .build())
                            .lastMessage(room.getLastMessage())
                            .lastMessageAt(room.getLastMessageAt())
                            .unreadCount(unreadCount)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // 메시지 전송
    @Transactional
    public ChatMessageResponse sendMessage(Long chatRoomId, String senderUserId, String content) {
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다"));
        User sender = userRepository.findByUserId(senderUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ChatMessage message = ChatMessage.builder()
                .chatRoom(room)
                .sender(sender)
                .content(content)
                .build();
        chatMessageRepository.save(message);

        // 채팅방 마지막 메시지 업데이트
        room.setLastMessage(content.length() > 100 ? content.substring(0, 100) + "..." : content);
        room.setLastMessageAt(LocalDateTime.now());
        chatRoomRepository.save(room);

        // 상대방에게 알림
        User otherUser = room.getUser1().getUserId().equals(senderUserId) ? room.getUser2() : room.getUser1();
        notificationService.createAndSend(
                otherUser.getUserId(),
                senderUserId,
                sender.getName(),
                "CHAT",
                sender.getName() + "님이 메시지를 보냈습니다",
                chatRoomId
        );

        return toMessageResponse(message);
    }

    // 채팅방 메시지 목록
    @Transactional
    public List<ChatMessageResponse> getMessages(Long chatRoomId, String userId) {
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        // 읽음 처리
        chatMessageRepository.markAsRead(room, user);

        return chatMessageRepository.findByChatRoomOrderBySentAtAsc(room).stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());
    }

    // 채팅방 나가기 (1:1)
    @Transactional
    public void leaveRoom(Long roomId, String userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 해당 사용자가 이 채팅방의 멤버인지 확인
        if (!room.getUser1().getUserId().equals(userId) && !room.getUser2().getUserId().equals(userId)) {
            throw new RuntimeException("이 채팅방의 멤버가 아닙니다.");
        }

        // 메시지 먼저 삭제 후 채팅방 삭제
        chatMessageRepository.deleteByChatRoom(room);
        chatRoomRepository.delete(room);
    }

    private ChatMessageResponse toMessageResponse(ChatMessage msg) {
        return ChatMessageResponse.builder()
                .id(msg.getId())
                .chatRoomId(msg.getChatRoom().getId())
                .senderUserId(msg.getSender().getUserId())
                .senderName(msg.getSender().getName())
                .content(msg.getContent())
                .isRead(msg.getIsRead())
                .sentAt(msg.getSentAt())
                .build();
    }
}
