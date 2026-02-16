package com.ourclass.backend.controller;

import com.ourclass.backend.dto.MessageRequest;
import com.ourclass.backend.dto.MessageResponse;
import com.ourclass.backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public ResponseEntity<?> sendMessage(
            @RequestParam String senderId,
            @RequestBody MessageRequest request) {
        try {
            MessageResponse response = messageService.sendMessage(senderId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("쪽지 전송 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/received")
    public ResponseEntity<?> getReceivedMessages(@RequestParam String userId) {
        try {
            List<MessageResponse> messages = messageService.getReceivedMessages(userId);
            return ResponseEntity.ok(messages);
        } catch (RuntimeException e) {
            log.error("받은 쪽지 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/sent")
    public ResponseEntity<?> getSentMessages(@RequestParam String userId) {
        try {
            List<MessageResponse> messages = messageService.getSentMessages(userId);
            return ResponseEntity.ok(messages);
        } catch (RuntimeException e) {
            log.error("보낸 쪽지 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@RequestParam String userId) {
        try {
            long count = messageService.getUnreadCount(userId);
            return ResponseEntity.ok(count);
        } catch (RuntimeException e) {
            log.error("읽지 않은 쪽지 개수 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{messageId}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long messageId,
            @RequestParam String userId) {
        try {
            messageService.markAsRead(messageId, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            log.error("쪽지 읽음 처리 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable Long messageId,
            @RequestParam String userId) {
        try {
            messageService.deleteMessage(messageId, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            log.error("쪽지 삭제 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
