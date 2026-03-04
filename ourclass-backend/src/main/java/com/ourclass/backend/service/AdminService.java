package com.ourclass.backend.service;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.entity.*;
import com.ourclass.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
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

    @Autowired
    private AlumniShopRepository alumniShopRepository;

    @Autowired
    private AlumniShopReviewRepository alumniShopReviewRepository;

    @Autowired
    private ReunionRepository reunionRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    // ===== 사용자 관리 =====

    public List<UserManagementResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserManagementResponse)
                .collect(Collectors.toList());
    }

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

    @Transactional
    public void suspendUser(String userId, String adminId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        verifyAdmin(adminId);
        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);
    }

    @Transactional
    public void unsuspendUser(String userId, String adminId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        verifyAdmin(adminId);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    @Transactional
    public void changeUserRole(String userId, UserRole newRole, String adminId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        verifyAdmin(adminId);
        user.setRole(newRole);
        userRepository.save(user);
    }

    // ===== 게시글 관리 =====

    public List<AdminPostResponse> getAllPosts(String keyword) {
        List<Post> posts;
        if (keyword == null || keyword.trim().isEmpty()) {
            posts = postRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        } else {
            posts = postRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                    .stream()
                    .filter(p -> p.getContent().contains(keyword)
                            || p.getAuthor().getName().contains(keyword)
                            || p.getAuthor().getUserId().contains(keyword))
                    .collect(Collectors.toList());
        }
        return posts.stream().map(this::toAdminPostResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deletePost(Long postId, String adminId) {
        verifyAdmin(adminId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
        postRepository.delete(post);
    }

    // ===== 댓글 관리 =====

    public List<AdminCommentResponse> getAllComments(String keyword) {
        List<Comment> comments;
        if (keyword == null || keyword.trim().isEmpty()) {
            comments = commentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        } else {
            comments = commentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                    .stream()
                    .filter(c -> c.getContent().contains(keyword)
                            || c.getAuthor().getName().contains(keyword)
                            || c.getAuthor().getUserId().contains(keyword))
                    .collect(Collectors.toList());
        }
        return comments.stream().map(this::toAdminCommentResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteComment(Long commentId, String adminId) {
        verifyAdmin(adminId);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));
        commentRepository.delete(comment);
    }

    // ===== 동창가게 관리 =====

    public List<AdminShopResponse> getAllShops(String keyword) {
        List<AlumniShop> shops = alumniShopRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (keyword != null && !keyword.trim().isEmpty()) {
            shops = shops.stream()
                    .filter(s -> s.getShopName().contains(keyword)
                            || s.getOwner().getName().contains(keyword)
                            || s.getOwner().getUserId().contains(keyword)
                            || (s.getAddress() != null && s.getAddress().contains(keyword)))
                    .collect(Collectors.toList());
        }
        return shops.stream().map(this::toAdminShopResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteShop(Long shopId, String adminId) {
        verifyAdmin(adminId);
        AlumniShop shop = alumniShopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("가게를 찾을 수 없습니다."));
        alumniShopRepository.delete(shop);
    }

    @Transactional
    public void deleteShopReview(Long reviewId, String adminId) {
        verifyAdmin(adminId);
        AlumniShopReview review = alumniShopReviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("리뷰를 찾을 수 없습니다."));
        alumniShopReviewRepository.delete(review);
    }

    // ===== 찐모임 관리 =====

    public List<AdminReunionResponse> getAllReunions(String keyword) {
        List<Reunion> reunions = reunionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (keyword != null && !keyword.trim().isEmpty()) {
            reunions = reunions.stream()
                    .filter(r -> r.getName().contains(keyword)
                            || (r.getSchoolName() != null && r.getSchoolName().contains(keyword))
                            || r.getCreatedBy().getName().contains(keyword))
                    .collect(Collectors.toList());
        }
        return reunions.stream().map(this::toAdminReunionResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteReunion(Long reunionId, String adminId) {
        verifyAdmin(adminId);
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다."));
        reunionRepository.delete(reunion);
    }

    // ===== 공지사항 관리 =====

    public List<AnnouncementResponse> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toAnnouncementResponse).collect(Collectors.toList());
    }

    public List<AnnouncementResponse> getActiveAnnouncements() {
        return announcementRepository.findByActiveTrueOrderByCreatedAtDesc()
                .stream().map(this::toAnnouncementResponse).collect(Collectors.toList());
    }

    @Transactional
    public AnnouncementResponse createAnnouncement(String title, String content, String adminId) {
        User admin = verifyAdmin(adminId);
        Announcement announcement = Announcement.builder()
                .title(title)
                .content(content)
                .active(true)
                .createdBy(admin)
                .build();
        announcement = announcementRepository.save(announcement);
        return toAnnouncementResponse(announcement);
    }

    @Transactional
    public AnnouncementResponse updateAnnouncement(Long id, String title, String content, Boolean active, String adminId) {
        verifyAdmin(adminId);
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("공지사항을 찾을 수 없습니다."));
        if (title != null) announcement.setTitle(title);
        if (content != null) announcement.setContent(content);
        if (active != null) announcement.setActive(active);
        announcement = announcementRepository.save(announcement);
        return toAnnouncementResponse(announcement);
    }

    @Transactional
    public void deleteAnnouncement(Long id, String adminId) {
        verifyAdmin(adminId);
        announcementRepository.deleteById(id);
    }

    // ===== 통계 =====

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

    // ===== 헬퍼 =====

    private User verifyAdmin(String adminId) {
        User admin = userRepository.findByUserId(adminId)
                .orElseThrow(() -> new RuntimeException("관리자를 찾을 수 없습니다."));
        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("관리자 권한이 필요합니다.");
        }
        return admin;
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

    private AdminPostResponse toAdminPostResponse(Post post) {
        String content = post.getContent();
        if (content.length() > 100) content = content.substring(0, 100) + "...";
        return AdminPostResponse.builder()
                .id(post.getId())
                .authorUserId(post.getAuthor().getUserId())
                .authorName(post.getAuthor().getName())
                .content(content)
                .schoolName(post.getSchoolName())
                .graduationYear(post.getGraduationYear())
                .visibility(post.getVisibility())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .viewCount(post.getViewCount())
                .imageCount(post.getImageUrls() != null ? post.getImageUrls().size() : 0)
                .createdAt(post.getCreatedAt().toString())
                .build();
    }

    private AdminCommentResponse toAdminCommentResponse(Comment comment) {
        String postPreview = comment.getPost().getContent();
        if (postPreview.length() > 50) postPreview = postPreview.substring(0, 50) + "...";
        return AdminCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .postContentPreview(postPreview)
                .authorUserId(comment.getAuthor().getUserId())
                .authorName(comment.getAuthor().getName())
                .content(comment.getContent())
                .isReply(comment.getParentComment() != null)
                .createdAt(comment.getCreatedAt().toString())
                .build();
    }

    private AdminShopResponse toAdminShopResponse(AlumniShop shop) {
        long reviewCount = alumniShopReviewRepository.countByShop(shop);
        Double avgRating = alumniShopReviewRepository.findAverageRatingByShop(shop);
        return AdminShopResponse.builder()
                .id(shop.getId())
                .shopName(shop.getShopName())
                .category(shop.getCategory())
                .subCategory(shop.getSubCategory())
                .ownerUserId(shop.getOwner().getUserId())
                .ownerName(shop.getOwner().getName())
                .address(shop.getAddress())
                .phone(shop.getPhone())
                .reviewCount((int) reviewCount)
                .avgRating(avgRating)
                .createdAt(shop.getCreatedAt().toString())
                .build();
    }

    private AdminReunionResponse toAdminReunionResponse(Reunion reunion) {
        return AdminReunionResponse.builder()
                .id(reunion.getId())
                .name(reunion.getName())
                .description(reunion.getDescription())
                .schoolName(reunion.getSchoolName())
                .graduationYear(reunion.getGraduationYear())
                .inviteCode(reunion.getInviteCode())
                .createdByUserId(reunion.getCreatedBy().getUserId())
                .createdByName(reunion.getCreatedBy().getName())
                .memberCount(reunion.getMembers() != null ? reunion.getMembers().size() : 0)
                .createdAt(reunion.getCreatedAt().toString())
                .build();
    }

    private AnnouncementResponse toAnnouncementResponse(Announcement a) {
        return AnnouncementResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .content(a.getContent())
                .active(a.getActive())
                .createdByName(a.getCreatedBy().getName())
                .createdAt(a.getCreatedAt().toString())
                .updatedAt(a.getUpdatedAt().toString())
                .build();
    }
}
