package com.ourclass.backend.controller;

import com.ourclass.backend.dto.FriendResponse;
import com.ourclass.backend.service.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class FriendController {

    @Autowired
    private FriendService friendService;

    // 친구 요청 보내기
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(
            @RequestParam String userId,
            @RequestParam String targetUserId) {
        try {
            FriendResponse response = friendService.sendRequest(userId, targetUserId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 친구 요청 수락
    @PostMapping("/{friendshipId}/accept")
    public ResponseEntity<?> acceptRequest(
            @PathVariable Long friendshipId,
            @RequestParam String userId) {
        try {
            FriendResponse response = friendService.acceptRequest(friendshipId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 친구 삭제 / 요청 거절
    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<?> removeFriendship(
            @PathVariable Long friendshipId,
            @RequestParam String userId) {
        try {
            friendService.removeFriendship(friendshipId, userId);
            return ResponseEntity.ok(Map.of("message", "삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 내 친구 목록
    @GetMapping
    public ResponseEntity<?> getMyFriends(@RequestParam String userId) {
        try {
            List<FriendResponse> friends = friendService.getMyFriends(userId);
            return ResponseEntity.ok(friends);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 보낸 친구 요청 목록
    @GetMapping("/sent")
    public ResponseEntity<?> getSentRequests(@RequestParam String userId) {
        try {
            List<FriendResponse> requests = friendService.getSentRequests(userId);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 받은 친구 요청 목록
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingRequests(@RequestParam String userId) {
        try {
            List<FriendResponse> requests = friendService.getPendingRequests(userId);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 두 사용자 간 친구 상태 확인
    @GetMapping("/status")
    public ResponseEntity<?> getFriendshipStatus(
            @RequestParam String userId,
            @RequestParam String targetUserId) {
        try {
            Map<String, Object> status = friendService.getFriendshipStatus(userId, targetUserId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 일괄 친구 상태 조회
    @GetMapping("/statuses")
    public ResponseEntity<?> getBatchFriendshipStatus(
            @RequestParam String userId,
            @RequestParam List<String> targetUserIds) {
        try {
            Map<String, Map<String, Object>> statuses = friendService.getBatchFriendshipStatus(userId, targetUserIds);
            return ResponseEntity.ok(statuses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
