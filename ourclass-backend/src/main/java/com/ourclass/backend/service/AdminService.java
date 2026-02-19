package com.ourclass.backend.service;

import com.ourclass.backend.dto.AdminStatsResponse;
import com.ourclass.backend.dto.UserManagementResponse;
import com.ourclass.backend.entity.*;
import com.ourclass.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    // 전체 사용자 목록 조회
    public List<UserManagementResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserManagementResponse)
                .collect(Collectors.toList());
    }

    // 사용자 검색
    public List<UserManagementResponse> searchUsers(String keyword) {
        List<User> users;
        if (keyword == null || keyword.trim().isEmpty()) {
            users = userRepository.findAll();
        } else {
            users = userRepository.findByUserIdContainingOrNameContainingOrEmailContaining(
                    keyword, keyword, keyword);
        }
        return users.stream()
                .map(this::toUserManagementResponse)
                .collect(Collectors.toList());
    }

    // 사용자 정지
    @Transactional
    public void suspendUser(String userId, String adminId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        User admin = userRepository.findByUserId(adminId)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);
    }

    // 사용자 정지 해제
    @Transactional
    public void unsuspendUser(String userId, String adminId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        User admin = userRepository.findByUserId(adminId)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    // 사용자 역할 변경 (관리자로 승격 등)
    @Transactional
    public void changeUserRole(String userId, UserRole newRole, String adminId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        User admin = userRepository.findByUserId(adminId)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        user.setRole(newRole);
        userRepository.save(user);
    }

    // 게시글 강제 삭제 (관리자)
    @Transactional
    public void deletePost(Long postId, String adminId) {
        User admin = userRepository.findByUserId(adminId)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

        postRepository.delete(post);
    }

    // 댓글 강제 삭제 (관리자)
    @Transactional
    public void deleteComment(Long commentId, String adminId) {
        User admin = userRepository.findByUserId(adminId)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

        commentRepository.delete(comment);
    }

    // 통계 조회
    public AdminStatsResponse getStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);
        long suspendedUsers = userRepository.countByStatus(UserStatus.SUSPENDED);
        long totalPosts = postRepository.count();
        long totalComments = commentRepository.count();

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long todayUsers = userRepository.countTodayLogins(startOfDay);

        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        long onlineUsers = userRepository.countOnlineUsers(fiveMinutesAgo);

        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .suspendedUsers(suspendedUsers)
                .totalPosts(totalPosts)
                .totalComments(totalComments)
                .todayUsers(todayUsers)
                .onlineUsers(onlineUsers)
                .build();
    }

    private UserManagementResponse toUserManagementResponse(User user) {
        return UserManagementResponse.builder()
                .id(user.getId())
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .status(user.getStatus().name())
                .createdAt(user.getCreatedAt().toString())
                .lastLoginTime(user.getLastLoginTime() != null ? user.getLastLoginTime().toString() : null)
                .build();
    }
}
