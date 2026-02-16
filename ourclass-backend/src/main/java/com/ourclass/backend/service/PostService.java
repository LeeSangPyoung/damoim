package com.ourclass.backend.service;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.entity.Comment;
import com.ourclass.backend.entity.Post;
import com.ourclass.backend.entity.PostLike;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.entity.UserSchool;
import com.ourclass.backend.repository.CommentRepository;
import com.ourclass.backend.repository.PostLikeRepository;
import com.ourclass.backend.repository.PostRepository;
import com.ourclass.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private PostLikeRepository postLikeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public PostResponse createPost(String userId, CreatePostRequest request) {
        User author = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 학교 정보 결정: 요청에 있으면 사용, 없으면 첫 번째 학교
        String schoolName = request.getSchoolName();
        String graduationYear = request.getGraduationYear();
        if (schoolName == null || schoolName.isEmpty()) {
            if (author.getSchools() != null && !author.getSchools().isEmpty()) {
                schoolName = author.getSchools().get(0).getSchoolName();
                graduationYear = author.getSchools().get(0).getGraduationYear();
            }
        }

        // 공개 범위 결정
        String visibility = request.getVisibility();
        if (visibility == null || visibility.isEmpty()) {
            visibility = "SCHOOL";
        }

        String targetGrade = null;
        String targetClassNumber = null;

        // GRADE/CLASS 범위일 때: 요청에 명시된 학년/반 우선, 없으면 자동 설정
        if ("GRADE".equals(visibility) || "CLASS".equals(visibility)) {
            if (request.getTargetGrade() != null && !request.getTargetGrade().isEmpty()) {
                targetGrade = request.getTargetGrade();
                if ("CLASS".equals(visibility) && request.getTargetClassNumber() != null && !request.getTargetClassNumber().isEmpty()) {
                    targetClassNumber = request.getTargetClassNumber();
                }
            } else {
                UserSchool matchedSchool = findMatchingSchool(author, schoolName, graduationYear);
                targetGrade = matchedSchool.getGrade();
                if ("CLASS".equals(visibility)) {
                    targetClassNumber = matchedSchool.getClassNumber();
                }
            }
        }

        Post post = Post.builder()
                .author(author)
                .content(request.getContent())
                .imageUrls(request.getImageUrls() != null ? request.getImageUrls() : new ArrayList<>())
                .schoolName(schoolName)
                .graduationYear(graduationYear)
                .visibility(visibility)
                .targetGrade(targetGrade)
                .targetClassNumber(targetClassNumber)
                .build();

        Post savedPost = postRepository.save(post);
        return toPostResponse(savedPost, userId);
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getPosts(String userId, String filter, String reqSchoolName, String reqGraduationYear) {
        return getPosts(userId, filter, reqSchoolName, reqGraduationYear, null, null);
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getPosts(String userId, String filter, String reqSchoolName, String reqGraduationYear, String grade, String classNumber) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getSchools() == null || user.getSchools().isEmpty()) {
            return new ArrayList<>();
        }

        // 사용자의 해당 학교 모든 학년/반 정보 수집 (복수 학년/반 지원)
        List<UserSchool> matchingSchools = findAllMatchingSchools(user, reqSchoolName, reqGraduationYear);
        if (matchingSchools.isEmpty()) {
            return new ArrayList<>();
        }
        String schoolName = matchingSchools.get(0).getSchoolName();

        // 1단계: 해당 학교의 전체 게시글 가져오기
        List<Post> allSchoolPosts = postRepository.findBySchoolName(schoolName);

        // 2단계: visibility 기반 접근 필터링 (이 사용자가 볼 수 있는 글만)
        List<Post> accessiblePosts = allSchoolPosts.stream()
                .filter(post -> canUserAccessPost(post, matchingSchools))
                .collect(Collectors.toList());

        // 3단계: 탭별 필터링
        List<Post> filteredPosts;
        switch (filter) {
            case "myGrade":
                filteredPosts = accessiblePosts.stream()
                        .filter(post -> isPostForGradeTab(post, schoolName, matchingSchools))
                        .collect(Collectors.toList());
                break;
            case "myClass":
                // grade/classNumber가 지정된 경우 해당 학년+반으로 필터링
                if (grade != null && !grade.isEmpty() && classNumber != null && !classNumber.isEmpty()) {
                    final String filterGrade = grade;
                    final String filterClass = classNumber;
                    filteredPosts = allSchoolPosts.stream()
                            .filter(post -> "CLASS".equals(post.getVisibility())
                                    && filterGrade.equals(post.getTargetGrade())
                                    && filterClass.equals(post.getTargetClassNumber()))
                            .collect(Collectors.toList());
                } else {
                    filteredPosts = accessiblePosts.stream()
                            .filter(post -> isPostForClassTab(post, schoolName, matchingSchools))
                            .collect(Collectors.toList());
                }
                break;
            case "all":
            default:
                // "우리 학교" 탭: SCHOOL visibility 글만 표시 (GRADE/CLASS 글은 해당 탭에서만)
                filteredPosts = accessiblePosts.stream()
                        .filter(post -> {
                            String vis = post.getVisibility();
                            return vis == null || "SCHOOL".equals(vis);
                        })
                        .collect(Collectors.toList());
                break;
        }

        return filteredPosts.stream()
                .map(post -> toPostResponse(post, userId))
                .collect(Collectors.toList());
    }

    // 사용자가 이 게시글을 볼 수 있는지 (모든 학년/반 정보로 확인)
    private boolean canUserAccessPost(Post post, List<UserSchool> userSchools) {
        String vis = post.getVisibility();
        if (vis == null || "SCHOOL".equals(vis)) return true;

        if ("GRADE".equals(vis)) {
            return userSchools.stream().anyMatch(s ->
                    s.getGrade() != null && s.getGrade().equals(post.getTargetGrade()));
        }
        if ("CLASS".equals(vis)) {
            return userSchools.stream().anyMatch(s ->
                    s.getGrade() != null && s.getGrade().equals(post.getTargetGrade()) &&
                    s.getClassNumber() != null && s.getClassNumber().equals(post.getTargetClassNumber()));
        }
        return true;
    }

    // "우리 학년" 탭에 표시할 글인지 (GRADE visibility 글만)
    private boolean isPostForGradeTab(Post post, String schoolName, List<UserSchool> userSchools) {
        String vis = post.getVisibility();

        // GRADE visibility 글만 표시
        if (!"GRADE".equals(vis)) return false;

        // 사용자의 학년 중 하나와 일치하면 표시
        return userSchools.stream().anyMatch(s ->
                s.getGrade() != null && s.getGrade().equals(post.getTargetGrade()));
    }

    // "우리 반" 탭에 표시할 글인지 (CLASS visibility 글만)
    private boolean isPostForClassTab(Post post, String schoolName, List<UserSchool> userSchools) {
        String vis = post.getVisibility();

        // CLASS visibility 글만 표시
        if (!"CLASS".equals(vis)) return false;

        // 사용자의 학년+반 중 하나와 일치하면 표시
        return userSchools.stream().anyMatch(s ->
                s.getGrade() != null && s.getGrade().equals(post.getTargetGrade()) &&
                s.getClassNumber() != null && s.getClassNumber().equals(post.getTargetClassNumber()));
    }

    @Transactional
    public PostResponse getPost(Long postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        // Increase view count
        post.setViewCount(post.getViewCount() + 1);
        Post savedPost = postRepository.save(post);

        return toPostResponse(savedPost, userId);
    }

    @Transactional
    public PostResponse updatePost(Long postId, String userId, UpdatePostRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if user is the author
        if (!post.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to update this post");
        }

        post.setContent(request.getContent());
        if (request.getImageUrls() != null) {
            post.setImageUrls(request.getImageUrls());
        }

        Post savedPost = postRepository.save(post);
        return toPostResponse(savedPost, userId);
    }

    @Transactional
    public void deletePost(Long postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if user is the author
        if (!post.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this post");
        }

        // 댓글, 좋아요 먼저 삭제 (외래키 제약조건)
        commentRepository.deleteAllByPost(post);
        postLikeRepository.deleteAllByPost(post);
        postRepository.delete(post);
    }

    @Transactional
    public void toggleLike(Long postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if already liked
        if (postLikeRepository.existsByPostAndUser(post, user)) {
            // Unlike
            PostLike postLike = postLikeRepository.findByPostAndUser(post, user)
                    .orElseThrow(() -> new RuntimeException("Like not found"));
            postLikeRepository.delete(postLike);
            post.setLikeCount(post.getLikeCount() - 1);
        } else {
            // Like
            PostLike postLike = PostLike.builder()
                    .post(post)
                    .user(user)
                    .build();
            postLikeRepository.save(postLike);
            post.setLikeCount(post.getLikeCount() + 1);

            // 좋아요 알림 (본인 게시글 제외)
            String postAuthorId = post.getAuthor().getUserId();
            if (!postAuthorId.equals(userId)) {
                notificationService.createAndSend(
                        postAuthorId,
                        userId,
                        user.getName(),
                        "LIKE",
                        user.getName() + "님이 게시글에 좋아요를 눌렀습니다",
                        postId
                );
            }
        }

        postRepository.save(post);
    }

    @Transactional
    public CommentResponse addComment(Long postId, String userId, CreateCommentRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        User author = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 대댓글 처리: 부모 댓글 확인
        Comment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
        }

        // @멘션 처리: 언급된 사용자 조회
        List<User> mentionedUsers = new ArrayList<>();
        if (request.getMentionedUserIds() != null && !request.getMentionedUserIds().isEmpty()) {
            mentionedUsers = userRepository.findByUserIdIn(request.getMentionedUserIds());
        }

        Comment comment = Comment.builder()
                .post(post)
                .author(author)
                .content(request.getContent())
                .parentComment(parentComment)
                .build();

        // 멘션된 사용자 추가
        comment.getMentionedUsers().addAll(mentionedUsers);

        Comment savedComment = commentRepository.save(comment);

        // Update comment count (모든 댓글 카운트, 대댓글도 포함)
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        // 댓글 알림 (본인 게시글 제외)
        String postAuthorId = post.getAuthor().getUserId();
        if (!postAuthorId.equals(userId)) {
            notificationService.createAndSend(
                    postAuthorId,
                    userId,
                    author.getName(),
                    "COMMENT",
                    author.getName() + "님이 댓글을 남겼습니다",
                    postId
            );
        }

        return toCommentResponse(savedComment, userId);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long postId, String userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        List<Comment> allComments = commentRepository.findByPostOrderByCreatedAtAsc(post);

        // 최상위 댓글만 필터링 (parentComment가 null인 것)
        List<Comment> topLevelComments = allComments.stream()
                .filter(comment -> comment.getParentComment() == null)
                .collect(Collectors.toList());

        // 각 최상위 댓글을 CommentResponse로 변환 (대댓글 포함)
        return topLevelComments.stream()
                .map(comment -> toCommentResponse(comment, userId))
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse updateComment(Long commentId, String userId, String content) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to edit this comment");
        }

        comment.setContent(content);
        comment.setUpdatedAt(LocalDateTime.now());
        Comment savedComment = commentRepository.save(comment);
        return toCommentResponse(savedComment, userId);
    }

    @Transactional
    public void deleteComment(Long commentId, String userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        // Check if user is the author
        if (!comment.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this comment");
        }

        Post post = comment.getPost();

        // 삭제할 댓글 개수 계산 (자신 + 모든 대댓글)
        int deletedCount = 1 + countAllReplies(comment);

        commentRepository.delete(comment); // Cascade로 자동 삭제

        // Update comment count
        post.setCommentCount(post.getCommentCount() - deletedCount);
        postRepository.save(post);
    }

    private int countAllReplies(Comment comment) {
        int count = 0;
        for (Comment reply : comment.getReplies()) {
            count += 1 + countAllReplies(reply);
        }
        return count;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getNewPostCounts(String userId, Long lastSeenAll, Long lastSeenMyGrade, Long lastSeenMyClass, String reqSchoolName, String reqGraduationYear) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Long> counts = new HashMap<>();

        if (user.getSchools() == null || user.getSchools().isEmpty()) {
            counts.put("all", 0L);
            counts.put("myGrade", 0L);
            counts.put("myClass", 0L);
            return counts;
        }

        List<UserSchool> matchingSchools = findAllMatchingSchools(user, reqSchoolName, reqGraduationYear);
        if (matchingSchools.isEmpty()) {
            counts.put("all", 0L);
            counts.put("myGrade", 0L);
            counts.put("myClass", 0L);
            return counts;
        }
        String schoolName = matchingSchools.get(0).getSchoolName();

        // 전체 게시글을 가져와서 visibility 기반 필터링
        List<Post> allSchoolPosts = postRepository.findBySchoolName(schoolName);
        List<Post> accessiblePosts = allSchoolPosts.stream()
                .filter(post -> canUserAccessPost(post, matchingSchools))
                .collect(Collectors.toList());

        // 탭별 새 글 수 계산 ("우리 학교" 탭은 SCHOOL visibility만)
        long allCount = accessiblePosts.stream()
                .filter(p -> p.getId() > lastSeenAll)
                .filter(p -> {
                    String vis = p.getVisibility();
                    return vis == null || "SCHOOL".equals(vis);
                })
                .count();
        counts.put("all", allCount);

        long gradeCount = accessiblePosts.stream()
                .filter(p -> p.getId() > lastSeenMyGrade)
                .filter(p -> isPostForGradeTab(p, schoolName, matchingSchools))
                .count();
        counts.put("myGrade", gradeCount);

        long classCount = accessiblePosts.stream()
                .filter(p -> p.getId() > lastSeenMyClass)
                .filter(p -> isPostForClassTab(p, schoolName, matchingSchools))
                .count();
        counts.put("myClass", classCount);

        return counts;
    }

    @Transactional(readOnly = true)
    public long getNewPostCountForSchool(String userId, String schoolName, String graduationYear) {
        // 해당 학교의 전체 새 글 수 (lastSeen 0 = 전체)
        return postRepository.countNewBySchoolName(schoolName, 0L);
    }

    // 요청된 학교 정보와 매칭되는 UserSchool 찾기 (없으면 첫 번째)
    private UserSchool findMatchingSchool(User user, String reqSchoolName, String reqGraduationYear) {
        if (reqSchoolName != null && !reqSchoolName.isEmpty()) {
            for (UserSchool school : user.getSchools()) {
                if (school.getSchoolName().equals(reqSchoolName)) {
                    if (reqGraduationYear == null || reqGraduationYear.isEmpty() ||
                        school.getGraduationYear().equals(reqGraduationYear)) {
                        return school;
                    }
                }
            }
        }
        return user.getSchools().get(0);
    }

    // 요청된 학교 정보와 매칭되는 모든 UserSchool 찾기 (복수 학년/반 지원)
    private List<UserSchool> findAllMatchingSchools(User user, String reqSchoolName, String reqGraduationYear) {
        List<UserSchool> result = new ArrayList<>();
        if (reqSchoolName != null && !reqSchoolName.isEmpty()) {
            for (UserSchool school : user.getSchools()) {
                if (school.getSchoolName().equals(reqSchoolName)) {
                    if (reqGraduationYear == null || reqGraduationYear.isEmpty() ||
                        school.getGraduationYear().equals(reqGraduationYear)) {
                        result.add(school);
                    }
                }
            }
        }
        if (result.isEmpty() && user.getSchools() != null && !user.getSchools().isEmpty()) {
            result.add(user.getSchools().get(0));
        }
        return result;
    }

    private PostResponse toPostResponse(Post post, String currentUserId) {
        User author = post.getAuthor();

        // 게시글에 저장된 학교 정보 사용 (없으면 작성자 첫 번째 학교)
        String postSchoolName = post.getSchoolName();
        String postGraduationYear = post.getGraduationYear();
        if (postSchoolName == null || postSchoolName.isEmpty()) {
            UserSchool fallbackSchool = author.getSchools() != null && !author.getSchools().isEmpty()
                    ? author.getSchools().get(0) : null;
            postSchoolName = fallbackSchool != null ? fallbackSchool.getSchoolName() : null;
            postGraduationYear = fallbackSchool != null ? fallbackSchool.getGraduationYear() : null;
        }

        // Check if current user liked this post
        User currentUser = null;
        Boolean liked = false;
        if (currentUserId != null) {
            currentUser = userRepository.findByUserId(currentUserId).orElse(null);
            if (currentUser != null) {
                liked = postLikeRepository.existsByPostAndUser(post, currentUser);
            }
        }

        return PostResponse.builder()
                .id(post.getId())
                .author(PostResponse.AuthorInfo.builder()
                        .userId(author.getUserId())
                        .name(author.getName())
                        .profileImageUrl(author.getProfileImageUrl())
                        .schoolName(postSchoolName)
                        .graduationYear(postGraduationYear)
                        .build())
                .content(post.getContent())
                .imageUrls(post.getImageUrls())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .viewCount(post.getViewCount())
                .liked(liked)
                .visibility(post.getVisibility())
                .targetGrade(post.getTargetGrade())
                .targetClassNumber(post.getTargetClassNumber())
                .build();
    }

    private CommentResponse toCommentResponse(Comment comment, String currentUserId) {
        User author = comment.getAuthor();

        Boolean canDelete = false;
        Boolean canEdit = false;
        if (currentUserId != null) {
            canDelete = author.getUserId().equals(currentUserId);
            canEdit = author.getUserId().equals(currentUserId);
        }

        // 대댓글 리스트 변환 (재귀적으로)
        List<CommentResponse> replyResponses = comment.getReplies().stream()
                .map(reply -> toCommentResponse(reply, currentUserId))
                .collect(Collectors.toList());

        // 멘션된 사용자 리스트 변환
        List<CommentResponse.MentionedUserInfo> mentionedUserInfos = comment.getMentionedUsers().stream()
                .map(user -> CommentResponse.MentionedUserInfo.builder()
                        .userId(user.getUserId())
                        .name(user.getName())
                        .build())
                .collect(Collectors.toList());

        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .author(CommentResponse.AuthorInfo.builder()
                        .userId(author.getUserId())
                        .name(author.getName())
                        .profileImageUrl(author.getProfileImageUrl())
                        .build())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .canDelete(canDelete)
                .canEdit(canEdit)
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .replies(replyResponses)
                .mentionedUsers(mentionedUserInfos)
                .build();
    }
}
