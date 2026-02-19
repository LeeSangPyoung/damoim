package com.ourclass.backend.controller;

import com.ourclass.backend.dto.AdminStatsResponse;
import com.ourclass.backend.dto.UserManagementResponse;
import com.ourclass.backend.entity.UserRole;
import com.ourclass.backend.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class AdminController {

    @Autowired
    private AdminService adminService;

    // 전체 사용자 목록
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam String adminId) {
        try {
            List<UserManagementResponse> users = adminService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 사용자 검색
    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam String adminId,
            @RequestParam(required = false) String keyword) {
        try {
            List<UserManagementResponse> users = adminService.searchUsers(keyword);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 사용자 정지
    @PostMapping("/users/{userId}/suspend")
    public ResponseEntity<?> suspendUser(
            @PathVariable String userId,
            @RequestParam String adminId) {
        try {
            adminService.suspendUser(userId, adminId);
            return ResponseEntity.ok(Map.of("message", "사용자가 정지되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 사용자 정지 해제
    @PostMapping("/users/{userId}/unsuspend")
    public ResponseEntity<?> unsuspendUser(
            @PathVariable String userId,
            @RequestParam String adminId) {
        try {
            adminService.unsuspendUser(userId, adminId);
            return ResponseEntity.ok(Map.of("message", "사용자 정지가 해제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 사용자 역할 변경
    @PostMapping("/users/{userId}/role")
    public ResponseEntity<?> changeUserRole(
            @PathVariable String userId,
            @RequestParam String role,
            @RequestParam String adminId) {
        try {
            UserRole newRole = UserRole.valueOf(role);
            adminService.changeUserRole(userId, newRole, adminId);
            return ResponseEntity.ok(Map.of("message", "사용자 역할이 변경되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 게시글 삭제
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePost(
            @PathVariable Long postId,
            @RequestParam String adminId) {
        try {
            adminService.deletePost(postId, adminId);
            return ResponseEntity.ok(Map.of("message", "게시글이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 댓글 삭제
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long commentId,
            @RequestParam String adminId) {
        try {
            adminService.deleteComment(commentId, adminId);
            return ResponseEntity.ok(Map.of("message", "댓글이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 통계 조회
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestParam String adminId) {
        try {
            AdminStatsResponse stats = adminService.getStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
