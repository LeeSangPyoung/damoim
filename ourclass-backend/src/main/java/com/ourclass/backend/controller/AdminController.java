package com.ourclass.backend.controller;

import com.ourclass.backend.dto.*;
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

    // ===== 사용자 관리 =====

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestParam String adminId) {
        try {
            return ResponseEntity.ok(adminService.getAllUsers());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsers(@RequestParam String adminId, @RequestParam(required = false) String keyword) {
        try {
            return ResponseEntity.ok(adminService.searchUsers(keyword));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/{userId}/suspend")
    public ResponseEntity<?> suspendUser(@PathVariable String userId, @RequestParam String adminId) {
        try {
            adminService.suspendUser(userId, adminId);
            return ResponseEntity.ok(Map.of("message", "사용자가 정지되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/{userId}/unsuspend")
    public ResponseEntity<?> unsuspendUser(@PathVariable String userId, @RequestParam String adminId) {
        try {
            adminService.unsuspendUser(userId, adminId);
            return ResponseEntity.ok(Map.of("message", "사용자 정지가 해제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/{userId}/role")
    public ResponseEntity<?> changeUserRole(@PathVariable String userId, @RequestParam String role, @RequestParam String adminId) {
        try {
            adminService.changeUserRole(userId, UserRole.valueOf(role), adminId);
            return ResponseEntity.ok(Map.of("message", "사용자 역할이 변경되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== 게시글 관리 =====

    @GetMapping("/posts")
    public ResponseEntity<?> getAllPosts(@RequestParam String adminId, @RequestParam(required = false) String keyword) {
        try {
            return ResponseEntity.ok(adminService.getAllPosts(keyword));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePost(@PathVariable Long postId, @RequestParam String adminId) {
        try {
            adminService.deletePost(postId, adminId);
            return ResponseEntity.ok(Map.of("message", "게시글이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== 댓글 관리 =====

    @GetMapping("/comments")
    public ResponseEntity<?> getAllComments(@RequestParam String adminId, @RequestParam(required = false) String keyword) {
        try {
            return ResponseEntity.ok(adminService.getAllComments(keyword));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long commentId, @RequestParam String adminId) {
        try {
            adminService.deleteComment(commentId, adminId);
            return ResponseEntity.ok(Map.of("message", "댓글이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== 동창가게 관리 =====

    @GetMapping("/shops")
    public ResponseEntity<?> getAllShops(@RequestParam String adminId, @RequestParam(required = false) String keyword) {
        try {
            return ResponseEntity.ok(adminService.getAllShops(keyword));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/shops/{shopId}")
    public ResponseEntity<?> deleteShop(@PathVariable Long shopId, @RequestParam String adminId) {
        try {
            adminService.deleteShop(shopId, adminId);
            return ResponseEntity.ok(Map.of("message", "가게가 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/shop-reviews/{reviewId}")
    public ResponseEntity<?> deleteShopReview(@PathVariable Long reviewId, @RequestParam String adminId) {
        try {
            adminService.deleteShopReview(reviewId, adminId);
            return ResponseEntity.ok(Map.of("message", "리뷰가 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== 찐모임 관리 =====

    @GetMapping("/reunions")
    public ResponseEntity<?> getAllReunions(@RequestParam String adminId, @RequestParam(required = false) String keyword) {
        try {
            return ResponseEntity.ok(adminService.getAllReunions(keyword));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/reunions/{reunionId}")
    public ResponseEntity<?> deleteReunion(@PathVariable Long reunionId, @RequestParam String adminId) {
        try {
            adminService.deleteReunion(reunionId, adminId);
            return ResponseEntity.ok(Map.of("message", "모임이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== 공지사항 관리 =====

    @GetMapping("/announcements")
    public ResponseEntity<?> getAllAnnouncements(@RequestParam String adminId) {
        try {
            return ResponseEntity.ok(adminService.getAllAnnouncements());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/announcements")
    public ResponseEntity<?> createAnnouncement(@RequestBody Map<String, Object> body, @RequestParam String adminId) {
        try {
            Integer intervalSeconds = body.containsKey("intervalSeconds") ? ((Number) body.get("intervalSeconds")).intValue() : null;
            return ResponseEntity.ok(adminService.createAnnouncement((String) body.get("title"), (String) body.get("content"), intervalSeconds, adminId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/announcements/{id}")
    public ResponseEntity<?> updateAnnouncement(@PathVariable Long id, @RequestBody Map<String, Object> body, @RequestParam String adminId) {
        try {
            String title = body.containsKey("title") ? (String) body.get("title") : null;
            String content = body.containsKey("content") ? (String) body.get("content") : null;
            Boolean active = body.containsKey("active") ? (Boolean) body.get("active") : null;
            Integer intervalSeconds = body.containsKey("intervalSeconds") ? ((Number) body.get("intervalSeconds")).intValue() : null;
            return ResponseEntity.ok(adminService.updateAnnouncement(id, title, content, active, intervalSeconds, adminId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/announcements/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id, @RequestParam String adminId) {
        try {
            adminService.deleteAnnouncement(id, adminId);
            return ResponseEntity.ok(Map.of("message", "공지사항이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== 통계 =====

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestParam String adminId) {
        try {
            return ResponseEntity.ok(adminService.getStats());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ===== 공개 API (로그인한 사용자용) =====

    @GetMapping("/announcements/active")
    public ResponseEntity<?> getActiveAnnouncements() {
        try {
            return ResponseEntity.ok(adminService.getActiveAnnouncements());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
