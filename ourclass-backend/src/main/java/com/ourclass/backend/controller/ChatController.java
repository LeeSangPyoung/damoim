package com.ourclass.backend.controller;

import com.ourclass.backend.dto.ChatMessageRequest;
import com.ourclass.backend.dto.ChatMessageResponse;
import com.ourclass.backend.dto.ChatRoomResponse;
import com.ourclass.backend.entity.ChatRoom;
import com.ourclass.backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 채팅방 생성/조회
    @PostMapping("/rooms")
    public ResponseEntity<?> createOrGetRoom(
            @RequestParam String userId,
            @RequestParam String otherUserId) {
        try {
            ChatRoom room = chatService.getOrCreateRoom(userId, otherUserId);
            return ResponseEntity.ok(Map.of("roomId", room.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 내 채팅방 목록
    @GetMapping("/rooms")
    public ResponseEntity<?> getMyChatRooms(@RequestParam String userId) {
        try {
            List<ChatRoomResponse> rooms = chatService.getMyChatRooms(userId);
            return ResponseEntity.ok(rooms);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 채팅방 메시지 조회 (REST)
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable Long roomId,
            @RequestParam String userId) {
        try {
            List<ChatMessageResponse> messages = chatService.getMessages(roomId, userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 메시지 전송 (REST fallback)
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long roomId,
            @RequestParam String userId,
            @RequestBody ChatMessageRequest request) {
        try {
            ChatMessageResponse message = chatService.sendMessage(roomId, userId, request.getContent());
            // WebSocket으로도 브로드캐스트
            messagingTemplate.convertAndSend("/topic/chat/" + roomId, message);
            return ResponseEntity.ok(message);
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
            chatService.deleteMessage(messageId, userId);
            return ResponseEntity.ok(Map.of("message", "메시지가 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 모든 채팅방 메시지 일괄 읽음 처리
    @PutMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(@RequestParam String userId) {
        try {
            chatService.markAllAsRead(userId);
            return ResponseEntity.ok(Map.of("message", "모든 메시지를 읽음 처리했습니다."));
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
            chatService.leaveRoom(roomId, userId);
            return ResponseEntity.ok(Map.of("message", "채팅방을 나갔습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // WebSocket 메시지 전송
    @MessageMapping("/chat/{roomId}")
    public void handleWebSocketMessage(
            @DestinationVariable Long roomId,
            @Payload ChatMessageRequest request,
            @Header("senderUserId") String senderUserId) {
        ChatMessageResponse message = chatService.sendMessage(roomId, senderUserId, request.getContent());
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, message);
    }
}
