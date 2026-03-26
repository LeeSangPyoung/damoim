package com.ourclass.backend.controller;

import com.ourclass.backend.dto.ChatMessageRequest;
import com.ourclass.backend.dto.GroupChatMessageResponse;
import com.ourclass.backend.dto.GroupChatRoomResponse;
import com.ourclass.backend.entity.GroupChatMessage;
import com.ourclass.backend.service.GroupChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/group-chat")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class GroupChatController {

    // 타이핑 상태: roomId -> { userId -> timestamp }
    private static final ConcurrentHashMap<Long, ConcurrentHashMap<String, Long>> typingStatus = new ConcurrentHashMap<>();

    @Autowired
    private GroupChatService groupChatService;

    @Autowired
    private com.ourclass.backend.repository.UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 그룹 채팅방 생성
    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(
            @RequestParam String userId,
            @RequestParam String roomName,
            @RequestParam List<String> memberIds) {
        try {
            GroupChatRoomResponse room = groupChatService.createRoom(userId, roomName, memberIds);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 내 그룹 채팅방 목록
    @GetMapping("/rooms")
    public ResponseEntity<?> getMyRooms(@RequestParam String userId) {
        try {
            List<GroupChatRoomResponse> rooms = groupChatService.getMyRooms(userId);
            return ResponseEntity.ok(rooms);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 메시지 목록
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable Long roomId,
            @RequestParam String userId,
            @RequestParam(required = false, defaultValue = "true") boolean markRead) {
        try {
            List<GroupChatMessageResponse> messages = groupChatService.getMessages(roomId, userId, markRead);
            if (markRead) {
                messagingTemplate.convertAndSend("/topic/group-chat/" + roomId,
                        Map.of("type", "READ", "userId", userId));
            }
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 메시지 전송 (REST)
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long roomId,
            @RequestParam String userId,
            @RequestBody ChatMessageRequest request) {
        try {
            GroupChatMessageResponse message = groupChatService.sendMessage(
                    roomId, userId, request.getContent(),
                    request.getMessageType(), request.getAttachmentUrl(),
                    request.getFileName(), request.getFileSize());
            messagingTemplate.convertAndSend("/topic/group-chat/" + roomId, message);
            // 다른 멤버들에게 새 메시지 알림 (하단 탭 N뱃지용)
            String roomName = groupChatService.getRoomName(roomId);
            boolean isReunion = roomName != null && roomName.startsWith("[찐모임]");
            String notifyTopic = isReunion ? "/reunion-notify" : "/chat-notify";
            List<String> memberIds = groupChatService.getMemberUserIds(roomId);
            for (String memberId : memberIds) {
                if (!memberId.equals(userId)) {
                    messagingTemplate.convertAndSend("/topic/user/" + memberId + notifyTopic,
                            Map.of("type", "NEW_MESSAGE", "roomId", roomId, "source", isReunion ? "REUNION" : "GROUP"));
                }
            }
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 멤버 초대
    @PostMapping("/rooms/{roomId}/invite")
    public ResponseEntity<?> inviteMember(
            @PathVariable Long roomId,
            @RequestParam String userId,
            @RequestParam String newMemberId) {
        try {
            GroupChatMessage sysMsg = groupChatService.inviteMember(roomId, userId, newMemberId);
            GroupChatMessageResponse sysResponse = groupChatService.getSystemMessageResponse(sysMsg);
            messagingTemplate.convertAndSend("/topic/group-chat/" + roomId, sysResponse);
            return ResponseEntity.ok(Map.of("message", "초대되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 채팅방 나가기
    @DeleteMapping("/rooms/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(
            @PathVariable Long roomId,
            @RequestParam String userId) {
        try {
            GroupChatMessage sysMsg = groupChatService.leaveRoom(roomId, userId);
            GroupChatMessageResponse sysResponse = groupChatService.getSystemMessageResponse(sysMsg);
            messagingTemplate.convertAndSend("/topic/group-chat/" + roomId, sysResponse);
            return ResponseEntity.ok(Map.of("message", "퇴장했습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 멤버 강퇴
    @DeleteMapping("/rooms/{roomId}/kick")
    public ResponseEntity<?> kickMember(
            @PathVariable Long roomId,
            @RequestParam String userId,
            @RequestParam String targetUserId) {
        try {
            groupChatService.kickMember(roomId, userId, targetUserId);
            // 강퇴 시스템 메시지는 kickMember 내부에서 생성됨, 브로드캐스트
            GroupChatMessage sysMsg = groupChatService.getLastSystemMessage(roomId);
            if (sysMsg != null) {
                GroupChatMessageResponse sysResponse = groupChatService.getSystemMessageResponse(sysMsg);
                messagingTemplate.convertAndSend("/topic/group-chat/" + roomId, sysResponse);
            }
            return ResponseEntity.ok(Map.of("message", "강퇴되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 메시지 삭제 (카카오톡 스타일)
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable Long messageId,
            @RequestParam String userId) {
        try {
            groupChatService.deleteMessage(messageId, userId);
            return ResponseEntity.ok(Map.of("message", "메시지가 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // WebSocket 메시지 전송
    @MessageMapping("/group-chat/{roomId}")
    public void handleWebSocketMessage(
            @DestinationVariable Long roomId,
            @Payload ChatMessageRequest request,
            @Header("senderUserId") String senderUserId) {
        GroupChatMessageResponse message = groupChatService.sendMessage(
                roomId, senderUserId, request.getContent(),
                request.getMessageType(), request.getAttachmentUrl(),
                request.getFileName(), request.getFileSize());
        messagingTemplate.convertAndSend("/topic/group-chat/" + roomId, message);
    }

    // 타이핑 인디케이터 전송
    @PostMapping("/rooms/{roomId}/typing")
    public ResponseEntity<?> sendTypingIndicator(
            @PathVariable Long roomId,
            @RequestParam String userId,
            @RequestParam(defaultValue = "true") boolean typing) {
        try {
            if (typing) {
                typingStatus.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>())
                        .put(userId, System.currentTimeMillis());
            } else {
                var roomTyping = typingStatus.get(roomId);
                if (roomTyping != null) roomTyping.remove(userId);
            }
            var user = userRepository.findByUserId(userId).orElse(null);
            String name = user != null ? user.getName() : userId;
            messagingTemplate.convertAndSend("/topic/group-chat/" + roomId,
                    Map.of("type", "TYPING", "userId", userId, "userName", name, "typing", typing));
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 타이핑 상태 조회 (폴링용)
    @GetMapping("/rooms/{roomId}/typing")
    public ResponseEntity<?> getTypingStatus(
            @PathVariable Long roomId,
            @RequestParam String userId) {
        var roomTyping = typingStatus.get(roomId);
        if (roomTyping == null || roomTyping.isEmpty()) {
            return ResponseEntity.ok(Map.of("typingUsers", List.of()));
        }
        long now = System.currentTimeMillis();
        List<Map<String, String>> activeTypers = roomTyping.entrySet().stream()
                .filter(e -> !e.getKey().equals(userId) && (now - e.getValue()) < 5000)
                .map(e -> {
                    var u = userRepository.findByUserId(e.getKey()).orElse(null);
                    return Map.of("userId", e.getKey(), "userName", u != null ? u.getName() : e.getKey());
                })
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(Map.of("typingUsers", activeTypers));
    }
}
