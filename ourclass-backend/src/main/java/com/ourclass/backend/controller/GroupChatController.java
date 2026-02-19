package com.ourclass.backend.controller;

import com.ourclass.backend.dto.ChatMessageRequest;
import com.ourclass.backend.dto.GroupChatMessageResponse;
import com.ourclass.backend.dto.GroupChatRoomResponse;
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

@RestController
@RequestMapping("/api/group-chat")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class GroupChatController {

    @Autowired
    private GroupChatService groupChatService;

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
            @RequestParam String userId) {
        try {
            List<GroupChatMessageResponse> messages = groupChatService.getMessages(roomId, userId);
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
            GroupChatMessageResponse message = groupChatService.sendMessage(roomId, userId, request.getContent());
            messagingTemplate.convertAndSend("/topic/group-chat/" + roomId, message);
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
            groupChatService.inviteMember(roomId, userId, newMemberId);
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
            groupChatService.leaveRoom(roomId, userId);
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
        GroupChatMessageResponse message = groupChatService.sendMessage(roomId, senderUserId, request.getContent());
        messagingTemplate.convertAndSend("/topic/group-chat/" + roomId, message);
    }
}
