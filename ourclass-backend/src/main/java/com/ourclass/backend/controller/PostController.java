package com.ourclass.backend.controller;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.repository.UserRepository;
import com.ourclass.backend.service.ImageService;
import com.ourclass.backend.service.PostService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/posts")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class PostController {

    @Autowired
    private PostService postService;

    @Autowired
    private ImageService imageService;

    @Autowired
    private UserRepository userRepository;

    // 이미지 업로드
    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            String imageUrl = imageService.uploadImage(file);
            Map<String, String> response = new HashMap<>();
            response.put("url", imageUrl);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to upload image: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 게시글 작성
    @PostMapping
    public ResponseEntity<?> createPost(
            @RequestParam String userId,
            @RequestBody CreatePostRequest request) {
        try {
            PostResponse response = postService.createPost(userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 게시글 목록 조회
    @GetMapping
    public ResponseEntity<?> getPosts(
            @RequestParam String userId,
            @RequestParam(required = false, defaultValue = "all") String filter,
            @RequestParam(required = false) String schoolName,
            @RequestParam(required = false) String graduationYear,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String classNumber) {
        try {
            List<PostResponse> posts = postService.getPosts(userId, filter, schoolName, graduationYear, grade, classNumber);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 탭별 새 글 수 조회
    @GetMapping("/new-counts")
    public ResponseEntity<?> getNewPostCounts(
            @RequestParam String userId,
            @RequestParam(defaultValue = "0") Long lastSeenAll,
            @RequestParam(defaultValue = "0") Long lastSeenMyGrade,
            @RequestParam(defaultValue = "0") Long lastSeenMyClass,
            @RequestParam(required = false) String schoolName,
            @RequestParam(required = false) String graduationYear) {
        try {
            Map<String, Long> counts = postService.getNewPostCounts(userId, lastSeenAll, lastSeenMyGrade, lastSeenMyClass, schoolName, graduationYear);
            return ResponseEntity.ok(counts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 학교별 새 글 수 조회 (대시보드용)
    @GetMapping("/new-count-by-school")
    public ResponseEntity<?> getNewPostCountForSchool(
            @RequestParam String userId,
            @RequestParam String schoolName,
            @RequestParam String graduationYear) {
        try {
            long count = postService.getNewPostCountForSchool(userId, schoolName, graduationYear);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 게시글 상세 조회
    @GetMapping("/{postId}")
    public ResponseEntity<?> getPost(
            @PathVariable Long postId,
            @RequestParam String userId) {
        try {
            PostResponse post = postService.getPost(postId, userId);
            return ResponseEntity.ok(post);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 게시글 수정
    @PutMapping("/{postId}")
    public ResponseEntity<?> updatePost(
            @PathVariable Long postId,
            @RequestParam String userId,
            @RequestBody UpdatePostRequest request) {
        try {
            PostResponse response = postService.updatePost(postId, userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 게시글 삭제
    @DeleteMapping("/{postId}")
    public ResponseEntity<?> deletePost(
            @PathVariable Long postId,
            @RequestParam String userId) {
        try {
            postService.deletePost(postId, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 좋아요 토글
    @PostMapping("/{postId}/like")
    public ResponseEntity<?> toggleLike(
            @PathVariable Long postId,
            @RequestParam String userId) {
        try {
            postService.toggleLike(postId, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 댓글 작성
    @PostMapping("/{postId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable Long postId,
            @RequestParam String userId,
            @RequestBody CreateCommentRequest request) {
        try {
            CommentResponse response = postService.addComment(postId, userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 댓글 목록 조회
    @GetMapping("/{postId}/comments")
    public ResponseEntity<?> getComments(
            @PathVariable Long postId,
            @RequestParam(required = false) String userId) {
        try {
            List<CommentResponse> comments = postService.getComments(postId, userId);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 댓글 수정
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<?> updateComment(
            @PathVariable Long commentId,
            @RequestParam String userId,
            @RequestBody Map<String, String> request) {
        try {
            CommentResponse response = postService.updateComment(commentId, userId, request.get("content"));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 댓글 삭제
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long commentId,
            @RequestParam String userId) {
        try {
            postService.deleteComment(commentId, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 사용자 검색 (멘션 자동완성용)
    @GetMapping("/search-users")
    public ResponseEntity<?> searchUsers(@RequestParam String query) {
        try {
            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            List<User> users = userRepository.findByNameOrUserIdContaining(query.trim());

            // 최대 10명까지만 반환
            List<Map<String, String>> userList = users.stream()
                    .limit(10)
                    .map(user -> {
                        Map<String, String> userInfo = new HashMap<>();
                        userInfo.put("userId", user.getUserId());
                        userInfo.put("name", user.getName());
                        userInfo.put("profileImageUrl", user.getProfileImageUrl());
                        return userInfo;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(userList);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
