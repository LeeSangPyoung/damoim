package com.ourclass.backend.service;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.entity.*;
import com.ourclass.backend.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ReunionService {

    @Autowired private ReunionRepository reunionRepository;
    @Autowired private ReunionMemberRepository memberRepository;
    @Autowired private ReunionMeetingRepository meetingRepository;
    @Autowired private MeetingVoteOptionRepository voteOptionRepository;
    @Autowired private MeetingVoteRepository voteRepository;
    @Autowired private ReunionFeeRepository feeRepository;
    @Autowired private ReunionJoinRequestRepository joinRequestRepository;
    @Autowired private ReunionPostRepository reunionPostRepository;
    @Autowired private ReunionPostLikeRepository reunionPostLikeRepository;
    @Autowired private ReunionPostCommentRepository reunionPostCommentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private FeeGroupRepository feeGroupRepository;
    @PersistenceContext private EntityManager entityManager;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    // ========== 역할 헬퍼 ==========
    private boolean isLeaderOrAdmin(ReunionMemberRole role) {
        return role == ReunionMemberRole.LEADER || role == ReunionMemberRole.ADMIN;
    }

    private boolean canManageFees(ReunionMemberRole role) {
        return isLeaderOrAdmin(role) || role == ReunionMemberRole.TREASURER;
    }

    // ========== 동창회 ==========

    @Transactional
    public ReunionResponse createReunion(String creatorUserId, CreateReunionRequest request) {
        User creator = userRepository.findByUserId(creatorUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        Reunion reunion = Reunion.builder()
                .name(request.getName())
                .description(request.getDescription())
                .schoolCode(request.getSchoolCode())
                .schoolName(request.getSchoolName())
                .graduationYear(request.getGraduationYear())
                .coverImageUrl(request.getCoverImageUrl())
                .inviteCode(generateInviteCode())
                .createdBy(creator)
                .build();

        reunionRepository.save(reunion);

        // 개설자를 LEADER(모임장)로 추가
        ReunionMember adminMember = ReunionMember.builder()
                .reunion(reunion)
                .user(creator)
                .role(ReunionMemberRole.LEADER)
                .build();
        memberRepository.save(adminMember);

        // 초대 멤버 추가
        if (request.getMemberIds() != null) {
            for (String memberId : request.getMemberIds()) {
                if (memberId.equals(creatorUserId)) continue;
                User memberUser = userRepository.findByUserId(memberId).orElse(null);
                if (memberUser == null) continue;

                ReunionMember member = ReunionMember.builder()
                        .reunion(reunion)
                        .user(memberUser)
                        .role(ReunionMemberRole.MEMBER)
                        .build();
                memberRepository.save(member);

                notificationService.createAndSend(
                        memberId, creatorUserId, creator.getName(),
                        "REUNION_INVITE",
                        "[" + reunion.getName() + "] 동창회에 초대되었습니다",
                        reunion.getId()
                );
            }
        }

        log.info("동창회 개설: {} by {}", reunion.getName(), creatorUserId);
        return toReunionResponse(reunion, creatorUserId);
    }

    public List<ReunionResponse> getMyReunions(String userId) {
        List<Reunion> reunions = reunionRepository.findByMemberUserId(userId);
        return reunions.stream()
                .map(r -> toReunionResponse(r, userId))
                .collect(Collectors.toList());
    }

    public ReunionResponse getReunionDetail(Long reunionId, String userId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        return toReunionResponse(reunion, userId);
    }

    @Transactional
    public void inviteMembers(Long reunionId, String inviterUserId, List<String> memberIds) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        User inviter = userRepository.findByUserId(inviterUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        // 관리자 권한 확인
        ReunionMember inviterMember = memberRepository.findByReunionAndUser(reunion, inviter)
                .orElseThrow(() -> new RuntimeException("동창회 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(inviterMember.getRole())) {
            throw new RuntimeException("모임장만 초대할 수 있습니다");
        }

        for (String memberId : memberIds) {
            User memberUser = userRepository.findByUserId(memberId).orElse(null);
            if (memberUser == null) continue;
            if (memberRepository.existsByReunionAndUser(reunion, memberUser)) continue;

            ReunionMember member = ReunionMember.builder()
                    .reunion(reunion)
                    .user(memberUser)
                    .role(ReunionMemberRole.MEMBER)
                    .build();
            memberRepository.save(member);

            notificationService.createAndSend(
                    memberId, inviterUserId, inviter.getName(),
                    "REUNION_INVITE",
                    "[" + reunion.getName() + "] 동창회에 초대되었습니다",
                    reunion.getId()
            );
        }
    }

    @Transactional
    public void leaveReunion(Long reunionId, String userId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember member = memberRepository.findByReunionAndUser(reunion, user)
                .orElseThrow(() -> new RuntimeException("동창회 멤버가 아닙니다"));

        memberRepository.delete(member);

        // 모임장이 나가면 총무 우선, 없으면 첫 멤버를 모임장으로 승격
        if (isLeaderOrAdmin(member.getRole())) {
            List<ReunionMember> remaining = memberRepository.findByReunion(reunion);
            if (!remaining.isEmpty()) {
                ReunionMember promoted = remaining.stream()
                        .filter(m -> m.getRole() == ReunionMemberRole.TREASURER)
                        .findFirst()
                        .orElse(remaining.get(0));
                promoted.setRole(ReunionMemberRole.LEADER);
                memberRepository.save(promoted);
            }
        }

        log.info("동창회 탈퇴: {} from {}", userId, reunion.getName());
    }

    @Transactional
    public void removeMember(Long reunionId, String adminUserId, String targetUserId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new RuntimeException("대상 사용자를 찾을 수 없습니다"));

        ReunionMember adminMember = memberRepository.findByReunionAndUser(reunion, admin)
                .orElseThrow(() -> new RuntimeException("동창회 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(adminMember.getRole())) {
            throw new RuntimeException("모임장만 추방할 수 있습니다");
        }

        ReunionMember targetMember = memberRepository.findByReunionAndUser(reunion, target)
                .orElseThrow(() -> new RuntimeException("대상이 동창회 멤버가 아닙니다"));

        memberRepository.delete(targetMember);
        log.info("동창회 추방: {} from {} by {}", targetUserId, reunion.getName(), adminUserId);
    }

    // ========== 초대 코드 + 가입 신청 ==========

    private String generateInviteCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder code = new StringBuilder();
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 6; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        while (reunionRepository.findByInviteCode(code.toString()).isPresent()) {
            code = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                code.append(chars.charAt(random.nextInt(chars.length())));
            }
        }
        return code.toString();
    }

    @Transactional
    public ReunionResponse joinByCode(String userId, String inviteCode) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
        Reunion reunion = reunionRepository.findByInviteCode(inviteCode.toUpperCase())
                .orElseThrow(() -> new RuntimeException("유효하지 않은 초대 코드입니다"));

        if (memberRepository.existsByReunionAndUser(reunion, user)) {
            throw new RuntimeException("이미 가입된 모임입니다");
        }
        if (joinRequestRepository.existsByReunionAndUserAndStatus(reunion, user, JoinRequestStatus.PENDING)) {
            throw new RuntimeException("이미 가입 신청 중입니다");
        }

        ReunionJoinRequest request = ReunionJoinRequest.builder()
                .reunion(reunion)
                .user(user)
                .status(JoinRequestStatus.PENDING)
                .build();
        joinRequestRepository.save(request);

        // 관리자에게 알림
        List<ReunionMember> admins = memberRepository.findByReunion(reunion).stream()
                .filter(m -> isLeaderOrAdmin(m.getRole()))
                .collect(Collectors.toList());
        for (ReunionMember admin : admins) {
            notificationService.createAndSend(
                    admin.getUser().getUserId(), userId, user.getName(),
                    "REUNION_JOIN_REQUEST",
                    "[" + reunion.getName() + "] " + user.getName() + "님이 가입을 요청했습니다",
                    reunion.getId()
            );
        }

        log.info("모임 가입 신청: {} -> {}", userId, reunion.getName());
        return toReunionResponse(reunion, userId);
    }

    public ReunionResponse getReunionByCode(String inviteCode) {
        Reunion reunion = reunionRepository.findByInviteCode(inviteCode.toUpperCase())
                .orElseThrow(() -> new RuntimeException("유효하지 않은 초대 코드입니다"));
        return toReunionResponse(reunion, null);
    }

    public List<JoinRequestResponse> getJoinRequests(Long reunionId, String userId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember member = memberRepository.findByReunionAndUser(reunion, user)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(member.getRole())) {
            throw new RuntimeException("모임장만 조회할 수 있습니다");
        }

        return joinRequestRepository.findByReunionAndStatus(reunion, JoinRequestStatus.PENDING)
                .stream()
                .map(this::toJoinRequestResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void approveJoinRequest(Long requestId, String adminUserId) {
        ReunionJoinRequest request = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("가입 신청을 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember adminMember = memberRepository.findByReunionAndUser(request.getReunion(), admin)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(adminMember.getRole())) {
            throw new RuntimeException("모임장만 승인할 수 있습니다");
        }

        request.setStatus(JoinRequestStatus.APPROVED);
        request.setProcessedAt(LocalDateTime.now());
        joinRequestRepository.save(request);

        ReunionMember newMember = ReunionMember.builder()
                .reunion(request.getReunion())
                .user(request.getUser())
                .role(ReunionMemberRole.MEMBER)
                .build();
        memberRepository.save(newMember);

        notificationService.createAndSend(
                request.getUser().getUserId(), adminUserId, admin.getName(),
                "REUNION_JOIN_APPROVED",
                "[" + request.getReunion().getName() + "] 가입이 승인되었습니다",
                request.getReunion().getId()
        );
        log.info("가입 승인: {} -> {}", request.getUser().getUserId(), request.getReunion().getName());
    }

    @Transactional
    public void rejectJoinRequest(Long requestId, String adminUserId) {
        ReunionJoinRequest request = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("가입 신청을 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember adminMember = memberRepository.findByReunionAndUser(request.getReunion(), admin)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(adminMember.getRole())) {
            throw new RuntimeException("모임장만 거절할 수 있습니다");
        }

        request.setStatus(JoinRequestStatus.REJECTED);
        request.setProcessedAt(LocalDateTime.now());
        joinRequestRepository.save(request);

        notificationService.createAndSend(
                request.getUser().getUserId(), adminUserId, admin.getName(),
                "REUNION_JOIN_REJECTED",
                "[" + request.getReunion().getName() + "] 가입이 거절되었습니다",
                request.getReunion().getId()
        );
    }

    @Transactional
    public String regenerateInviteCode(Long reunionId, String adminUserId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember adminMember = memberRepository.findByReunionAndUser(reunion, admin)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(adminMember.getRole())) {
            throw new RuntimeException("모임장만 초대 코드를 재생성할 수 있습니다");
        }

        String newCode = generateInviteCode();
        reunion.setInviteCode(newCode);
        reunionRepository.save(reunion);
        return newCode;
    }

    // ========== 피드 ==========

    @Transactional
    public ReunionPostResponse createPost(Long reunionId, String userId, String content, List<String> imageUrls) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        memberRepository.findByReunionAndUser(reunion, user)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));

        ReunionPost post = ReunionPost.builder()
                .reunion(reunion)
                .author(user)
                .content(content)
                .imageUrls(imageUrls != null ? imageUrls : new ArrayList<>())
                .build();
        reunionPostRepository.save(post);

        List<ReunionMember> members = memberRepository.findByReunion(reunion);
        for (ReunionMember m : members) {
            if (m.getUser().getUserId().equals(userId)) continue;
            notificationService.createAndSend(
                    m.getUser().getUserId(), userId, user.getName(),
                    "REUNION_POST",
                    "[" + reunion.getName() + "] " + user.getName() + "님이 새 글을 올렸습니다",
                    post.getId()
            );
        }

        log.info("모임 피드 글 작성: {} in {}", userId, reunion.getName());
        return toReunionPostResponse(post, user);
    }

    public List<ReunionPostResponse> getPosts(Long reunionId, String userId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        memberRepository.findByReunionAndUser(reunion, user)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));

        return reunionPostRepository.findByReunionOrderByCreatedAtDesc(reunion).stream()
                .map(p -> toReunionPostResponse(p, user))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deletePost(Long postId, String userId) {
        ReunionPost post = reunionPostRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        boolean isAuthor = post.getAuthor().getUserId().equals(userId);
        boolean isAdmin = memberRepository.findByReunionAndUser(post.getReunion(), user)
                .map(m -> isLeaderOrAdmin(m.getRole()))
                .orElse(false);

        if (!isAuthor && !isAdmin) {
            throw new RuntimeException("삭제 권한이 없습니다");
        }

        reunionPostRepository.delete(post);
    }

    // ========== 좋아요 ==========

    @Transactional
    public void togglePostLike(Long postId, String userId) {
        ReunionPost post = reunionPostRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        var existing = reunionPostLikeRepository.findByReunionPostAndUser(post, user);
        if (existing.isPresent()) {
            reunionPostLikeRepository.delete(existing.get());
        } else {
            reunionPostLikeRepository.save(ReunionPostLike.builder()
                    .reunionPost(post)
                    .user(user)
                    .build());
        }
    }

    // ========== 댓글 ==========

    @Transactional
    public ReunionCommentResponse addComment(Long postId, String userId, String content, Long parentCommentId) {
        ReunionPost post = reunionPostRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionPostComment comment = ReunionPostComment.builder()
                .reunionPost(post)
                .author(user)
                .content(content)
                .build();

        if (parentCommentId != null) {
            ReunionPostComment parent = reunionPostCommentRepository.findById(parentCommentId)
                    .orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다"));
            comment.setParentComment(parent);
        }

        reunionPostCommentRepository.save(comment);
        return toCommentResponse(comment, userId);
    }

    public List<ReunionCommentResponse> getComments(Long postId, String userId) {
        ReunionPost post = reunionPostRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));

        return reunionPostCommentRepository.findByReunionPostAndParentCommentIsNullOrderByCreatedAtAsc(post)
                .stream()
                .map(c -> toCommentResponse(c, userId))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteComment(Long commentId, String userId) {
        ReunionPostComment comment = reunionPostCommentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다"));

        if (!comment.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("삭제 권한이 없습니다");
        }

        reunionPostCommentRepository.delete(comment);
    }

    @Transactional
    public ReunionCommentResponse updateComment(Long commentId, String userId, String content) {
        ReunionPostComment comment = reunionPostCommentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다"));

        if (!comment.getAuthor().getUserId().equals(userId)) {
            throw new RuntimeException("수정 권한이 없습니다");
        }

        comment.setContent(content);
        reunionPostCommentRepository.save(comment);
        return toCommentResponse(comment, userId);
    }

    // ========== 조회수 ==========

    @Transactional
    public ReunionPostResponse getPostDetail(Long postId, String userId) {
        ReunionPost post = reunionPostRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        // 조회수 증가 (작성자 제외)
        if (!post.getAuthor().getUserId().equals(userId)) {
            post.setViewCount(post.getViewCount() + 1);
            reunionPostRepository.save(post);
        }

        return toReunionPostResponse(post, user);
    }

    // ========== 모임 ==========

    @Transactional
    public MeetingResponse createMeeting(Long reunionId, String creatorUserId, CreateMeetingRequest request) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        User creator = userRepository.findByUserId(creatorUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMeeting meeting = ReunionMeeting.builder()
                .reunion(reunion)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(MeetingStatus.VOTING)
                .createdBy(creator)
                .build();
        meetingRepository.save(meeting);

        // 날짜 옵션 생성
        if (request.getDateOptions() != null) {
            for (String dateOpt : request.getDateOptions()) {
                MeetingVoteOption option = MeetingVoteOption.builder()
                        .meeting(meeting)
                        .type(VoteOptionType.DATE)
                        .optionValue(dateOpt)
                        .createdBy(creator)
                        .build();
                voteOptionRepository.save(option);
            }
        }

        // 장소 옵션 생성
        if (request.getLocationOptions() != null) {
            for (String locOpt : request.getLocationOptions()) {
                MeetingVoteOption option = MeetingVoteOption.builder()
                        .meeting(meeting)
                        .type(VoteOptionType.LOCATION)
                        .optionValue(locOpt)
                        .createdBy(creator)
                        .build();
                voteOptionRepository.save(option);
            }
        }

        // 모든 멤버에게 알림
        List<ReunionMember> members = memberRepository.findByReunion(reunion);
        for (ReunionMember m : members) {
            if (m.getUser().getUserId().equals(creatorUserId)) continue;
            notificationService.createAndSend(
                    m.getUser().getUserId(), creatorUserId, creator.getName(),
                    "MEETING_CREATED",
                    "[" + reunion.getName() + "] 새 모임: " + meeting.getTitle(),
                    meeting.getId()
            );
        }

        log.info("모임 개설: {} in {}", meeting.getTitle(), reunion.getName());
        return toMeetingResponse(meeting, creatorUserId);
    }

    @Transactional(readOnly = true)
    public List<MeetingResponse> getMeetings(Long reunionId, String userId) {
        log.info("=== getMeetings 호출: reunionId={}, userId={} ===", reunionId, userId);
        entityManager.clear();
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        List<ReunionMeeting> meetings = meetingRepository.findByReunionOrderByCreatedAtDesc(reunion);
        return meetings.stream()
                .map(m -> toMeetingResponse(m, userId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MeetingResponse getMeetingDetail(Long meetingId, String userId) {
        ReunionMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        return toMeetingResponse(meeting, userId);
    }

    @Transactional
    public MeetingResponse vote(Long optionId, String userId) {
        MeetingVoteOption option = voteOptionRepository.findById(optionId)
                .orElseThrow(() -> new RuntimeException("투표 옵션을 찾을 수 없습니다"));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        // 토글: 이미 투표했으면 취소, 아니면 투표
        if (voteRepository.existsByVoteOptionAndUser(option, user)) {
            MeetingVote vote = voteRepository.findByVoteOptionAndUser(option, user)
                    .orElseThrow();
            option.getVotes().remove(vote);
            voteRepository.delete(vote);
        } else {
            MeetingVote vote = MeetingVote.builder()
                    .voteOption(option)
                    .user(user)
                    .build();
            voteRepository.save(vote);
            option.getVotes().add(vote);
        }

        voteRepository.flush();
        return toMeetingResponse(option.getMeeting(), userId);
    }

    @Transactional
    public void confirmMeeting(Long meetingId, String adminUserId, String finalDate, String finalLocation) {
        ReunionMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        // 관리자 확인
        ReunionMember adminMember = memberRepository.findByReunionAndUser(meeting.getReunion(), admin)
                .orElseThrow(() -> new RuntimeException("동창회 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(adminMember.getRole())) {
            throw new RuntimeException("모임장만 확정할 수 있습니다");
        }

        meeting.setStatus(MeetingStatus.CONFIRMED);
        meeting.setFinalDate(finalDate);
        meeting.setFinalLocation(finalLocation);
        meetingRepository.save(meeting);

        // 모든 멤버에게 알림
        List<ReunionMember> members = memberRepository.findByReunion(meeting.getReunion());
        for (ReunionMember m : members) {
            if (m.getUser().getUserId().equals(adminUserId)) continue;
            notificationService.createAndSend(
                    m.getUser().getUserId(), adminUserId, admin.getName(),
                    "MEETING_CONFIRMED",
                    "[" + meeting.getReunion().getName() + "] 모임 확정: " + finalDate + " " + finalLocation,
                    meeting.getId()
            );
        }

        log.info("모임 확정: {} - {} {}", meeting.getTitle(), finalDate, finalLocation);
    }

    @Transactional
    public void cancelMeeting(Long meetingId, String adminUserId) {
        ReunionMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember adminMember = memberRepository.findByReunionAndUser(meeting.getReunion(), admin)
                .orElseThrow(() -> new RuntimeException("동창회 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(adminMember.getRole())) {
            throw new RuntimeException("모임장만 취소할 수 있습니다");
        }

        meeting.setStatus(MeetingStatus.CANCELLED);
        meetingRepository.save(meeting);

        List<ReunionMember> members = memberRepository.findByReunion(meeting.getReunion());
        for (ReunionMember m : members) {
            if (m.getUser().getUserId().equals(adminUserId)) continue;
            notificationService.createAndSend(
                    m.getUser().getUserId(), adminUserId, admin.getName(),
                    "MEETING_CANCELLED",
                    "[" + meeting.getReunion().getName() + "] 모임 취소: " + meeting.getTitle(),
                    meeting.getId()
            );
        }
    }

    // ========== 회비 ==========

    @Transactional
    public List<FeeResponse> createFees(Long reunionId, String adminUserId, CreateFeeRequest request) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember adminMember = memberRepository.findByReunionAndUser(reunion, admin)
                .orElseThrow(() -> new RuntimeException("동창회 멤버가 아닙니다"));
        if (!canManageFees(adminMember.getRole())) {
            throw new RuntimeException("모임장 또는 총무만 회비를 등록할 수 있습니다");
        }

        LocalDate dueDate = null;
        if (request.getDueDate() != null && !request.getDueDate().isEmpty()) {
            dueDate = LocalDate.parse(request.getDueDate());
        }

        List<ReunionMember> members = memberRepository.findByReunion(reunion);
        List<FeeResponse> responses = new ArrayList<>();

        for (ReunionMember m : members) {
            ReunionFee fee = ReunionFee.builder()
                    .reunion(reunion)
                    .user(m.getUser())
                    .amount(request.getAmount())
                    .description(request.getDescription())
                    .dueDate(dueDate)
                    .createdBy(admin)
                    .build();
            feeRepository.save(fee);
            responses.add(toFeeResponse(fee));

            if (!m.getUser().getUserId().equals(adminUserId)) {
                notificationService.createAndSend(
                        m.getUser().getUserId(), adminUserId, admin.getName(),
                        "FEE_CREATED",
                        "[" + reunion.getName() + "] 회비 " + request.getAmount() + "원이 등록되었습니다",
                        fee.getId()
                );
            }
        }

        log.info("회비 등록: {}원 x {}명 in {}", request.getAmount(), members.size(), reunion.getName());
        return responses;
    }

    public List<FeeResponse> getFees(Long reunionId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));
        return feeRepository.findByReunionOrderByCreatedAtDesc(reunion).stream()
                .map(this::toFeeResponse)
                .collect(Collectors.toList());
    }

    public FeeSummaryResponse getFeeSummary(Long reunionId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("동창회를 찾을 수 없습니다"));

        List<ReunionFee> fees = feeRepository.findByReunionOrderByCreatedAtDesc(reunion);
        int totalAmount = fees.stream().mapToInt(ReunionFee::getAmount).sum();
        int totalPaid = fees.stream().mapToInt(ReunionFee::getPaidAmount).sum();
        long paidCount = feeRepository.countByReunionAndStatus(reunion, FeeStatus.PAID);
        long unpaidCount = feeRepository.countByReunionAndStatus(reunion, FeeStatus.UNPAID);
        long partialCount = feeRepository.countByReunionAndStatus(reunion, FeeStatus.PARTIAL);

        return FeeSummaryResponse.builder()
                .totalAmount(totalAmount)
                .totalPaid(totalPaid)
                .totalUnpaid(totalAmount - totalPaid)
                .paidCount((int) paidCount)
                .unpaidCount((int) unpaidCount)
                .partialCount((int) partialCount)
                .build();
    }

    @Transactional
    public FeeResponse updateFeePayment(Long feeId, String adminUserId, int paidAmount) {
        ReunionFee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new RuntimeException("회비 정보를 찾을 수 없습니다"));
        User admin = userRepository.findByUserId(adminUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember adminMember = memberRepository.findByReunionAndUser(fee.getReunion(), admin)
                .orElseThrow(() -> new RuntimeException("동창회 멤버가 아닙니다"));
        if (!canManageFees(adminMember.getRole())) {
            throw new RuntimeException("모임장 또는 총무만 납부 처리할 수 있습니다");
        }

        fee.setPaidAmount(paidAmount);
        fee.setPaidAt(LocalDateTime.now());
        if (paidAmount >= fee.getAmount()) {
            fee.setStatus(FeeStatus.PAID);
        } else if (paidAmount > 0) {
            fee.setStatus(FeeStatus.PARTIAL);
        } else {
            fee.setStatus(FeeStatus.UNPAID);
        }
        feeRepository.save(fee);

        // 납부 대상자에게 알림
        if (!fee.getUser().getUserId().equals(adminUserId)) {
            notificationService.createAndSend(
                    fee.getUser().getUserId(), adminUserId, admin.getName(),
                    "FEE_UPDATED",
                    "[" + fee.getReunion().getName() + "] 회비 납부가 확인되었습니다",
                    fee.getId()
            );
        }

        return toFeeResponse(fee);
    }

    // ========== Helper ==========

    private ReunionResponse toReunionResponse(Reunion reunion, String currentUserId) {
        List<ReunionMember> members = memberRepository.findByReunion(reunion);
        String myRole = null;
        for (ReunionMember m : members) {
            if (m.getUser().getUserId().equals(currentUserId)) {
                myRole = m.getRole().name();
                break;
            }
        }

        return ReunionResponse.builder()
                .id(reunion.getId())
                .name(reunion.getName())
                .description(reunion.getDescription())
                .schoolCode(reunion.getSchoolCode())
                .schoolName(reunion.getSchoolName())
                .graduationYear(reunion.getGraduationYear())
                .coverImageUrl(reunion.getCoverImageUrl())
                .inviteCode(reunion.getInviteCode())
                .createdByUserId(reunion.getCreatedBy().getUserId())
                .createdByName(reunion.getCreatedBy().getName())
                .memberCount(members.size())
                .members(members.stream().map(m -> ReunionResponse.MemberInfo.builder()
                        .memberId(m.getId())
                        .userId(m.getUser().getUserId())
                        .name(m.getUser().getName())
                        .profileImageUrl(m.getUser().getProfileImageUrl())
                        .role(m.getRole().name())
                        .joinedAt(m.getJoinedAt() != null ? m.getJoinedAt().format(DT_FMT) : null)
                        .build()
                ).collect(Collectors.toList()))
                .createdAt(reunion.getCreatedAt() != null ? reunion.getCreatedAt().format(DT_FMT) : null)
                .myRole(myRole)
                .build();
    }

    private MeetingResponse toMeetingResponse(ReunionMeeting meeting, String currentUserId) {
        List<MeetingVoteOption> options = meeting.getVoteOptions();
        if (options == null || options.isEmpty()) {
            options = voteOptionRepository.findAll().stream()
                    .filter(o -> o.getMeeting().getId().equals(meeting.getId()))
                    .collect(Collectors.toList());
        }

        List<MeetingResponse.VoteOptionInfo> dateOptions = new ArrayList<>();
        List<MeetingResponse.VoteOptionInfo> locationOptions = new ArrayList<>();

        for (MeetingVoteOption opt : options) {
            // 네이티브 SQL로 DB 직접 조회 (JPA 캐시 완전 우회)
            List<Object[]> voteRows = voteRepository.findVotesByOptionIdNative(opt.getId());
            log.info("Option ID={}, native votes count={}, voters={}", opt.getId(), voteRows.size(),
                    voteRows.stream().map(r -> String.valueOf(r[1])).collect(Collectors.joining(",")));

            boolean myVote = voteRows.stream()
                    .anyMatch(r -> String.valueOf(r[1]).equals(currentUserId));

            MeetingResponse.VoteOptionInfo info = MeetingResponse.VoteOptionInfo.builder()
                    .id(opt.getId())
                    .type(opt.getType().name())
                    .optionValue(opt.getOptionValue())
                    .voteCount(voteRows.size())
                    .voters(voteRows.stream().map(r -> MeetingResponse.VoterInfo.builder()
                            .userId(String.valueOf(r[1]))
                            .name(String.valueOf(r[2]))
                            .build()
                    ).collect(Collectors.toList()))
                    .myVote(myVote)
                    .build();

            if (opt.getType() == VoteOptionType.DATE) {
                dateOptions.add(info);
            } else {
                locationOptions.add(info);
            }
        }

        return MeetingResponse.builder()
                .id(meeting.getId())
                .reunionId(meeting.getReunion().getId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .status(meeting.getStatus().name())
                .finalDate(meeting.getFinalDate())
                .finalLocation(meeting.getFinalLocation())
                .createdByUserId(meeting.getCreatedBy().getUserId())
                .createdByName(meeting.getCreatedBy().getName())
                .createdAt(meeting.getCreatedAt() != null ? meeting.getCreatedAt().format(DT_FMT) : null)
                .dateOptions(dateOptions)
                .locationOptions(locationOptions)
                .build();
    }

    private JoinRequestResponse toJoinRequestResponse(ReunionJoinRequest request) {
        return JoinRequestResponse.builder()
                .id(request.getId())
                .reunionId(request.getReunion().getId())
                .userId(request.getUser().getUserId())
                .userName(request.getUser().getName())
                .profileImageUrl(request.getUser().getProfileImageUrl())
                .status(request.getStatus().name())
                .requestedAt(request.getRequestedAt() != null ? request.getRequestedAt().format(DT_FMT) : null)
                .processedAt(request.getProcessedAt() != null ? request.getProcessedAt().format(DT_FMT) : null)
                .build();
    }

    private ReunionPostResponse toReunionPostResponse(ReunionPost post, User currentUser) {
        long likeCount = reunionPostLikeRepository.countByReunionPost(post);
        long commentCount = reunionPostCommentRepository.countByReunionPost(post);
        boolean liked = reunionPostLikeRepository.existsByReunionPostAndUser(post, currentUser);

        return ReunionPostResponse.builder()
                .id(post.getId())
                .reunionId(post.getReunion().getId())
                .authorUserId(post.getAuthor().getUserId())
                .authorName(post.getAuthor().getName())
                .authorProfileImageUrl(post.getAuthor().getProfileImageUrl())
                .content(post.getContent())
                .imageUrls(post.getImageUrls())
                .createdAt(post.getCreatedAt() != null ? post.getCreatedAt().format(DT_FMT) : null)
                .likeCount(likeCount)
                .commentCount(commentCount)
                .viewCount(post.getViewCount())
                .liked(liked)
                .build();
    }

    private ReunionCommentResponse toCommentResponse(ReunionPostComment comment, String currentUserId) {
        boolean isAuthor = comment.getAuthor().getUserId().equals(currentUserId);
        List<ReunionCommentResponse> replies = comment.getReplies() != null
                ? comment.getReplies().stream()
                    .map(r -> toCommentResponse(r, currentUserId))
                    .collect(Collectors.toList())
                : new ArrayList<>();

        return ReunionCommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getReunionPost().getId())
                .authorUserId(comment.getAuthor().getUserId())
                .authorName(comment.getAuthor().getName())
                .authorProfileImageUrl(comment.getAuthor().getProfileImageUrl())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt() != null ? comment.getCreatedAt().format(DT_FMT) : null)
                .updatedAt(comment.getUpdatedAt() != null && !comment.getUpdatedAt().equals(comment.getCreatedAt())
                        ? comment.getUpdatedAt().format(DT_FMT) : null)
                .canEdit(isAuthor)
                .canDelete(isAuthor)
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .replies(replies)
                .build();
    }

    private FeeResponse toFeeResponse(ReunionFee fee) {
        return FeeResponse.builder()
                .id(fee.getId())
                .reunionId(fee.getReunion().getId())
                .feeGroupId(fee.getFeeGroup() != null ? fee.getFeeGroup().getId() : null)
                .userId(fee.getUser().getUserId())
                .userName(fee.getUser().getName())
                .amount(fee.getAmount())
                .paidAmount(fee.getPaidAmount())
                .status(fee.getStatus().name())
                .description(fee.getDescription())
                .dueDate(fee.getDueDate() != null ? fee.getDueDate().toString() : null)
                .paidAt(fee.getPaidAt() != null ? fee.getPaidAt().format(DT_FMT) : null)
                .createdAt(fee.getCreatedAt() != null ? fee.getCreatedAt().format(DT_FMT) : null)
                .build();
    }

    private FeeGroupResponse toFeeGroupResponse(FeeGroup feeGroup) {
        List<ReunionFee> fees = feeRepository.findByFeeGroup(feeGroup);
        long paidCount = fees.stream().filter(f -> f.getStatus() == FeeStatus.PAID).count();
        int totalPaid = fees.stream()
                .filter(f -> f.getStatus() == FeeStatus.PAID)
                .mapToInt(ReunionFee::getAmount)
                .sum();

        return FeeGroupResponse.builder()
                .id(feeGroup.getId())
                .reunionId(feeGroup.getReunion().getId())
                .description(feeGroup.getDescription())
                .amountPerMember(feeGroup.getAmountPerMember())
                .dueDate(feeGroup.getDueDate() != null ? feeGroup.getDueDate().toString() : null)
                .createdByUserId(feeGroup.getCreatedBy().getUserId())
                .createdByName(feeGroup.getCreatedBy().getName())
                .createdAt(feeGroup.getCreatedAt() != null ? feeGroup.getCreatedAt().format(DT_FMT) : null)
                .totalMembers(fees.size())
                .paidCount((int) paidCount)
                .unpaidCount(fees.size() - (int) paidCount)
                .totalAmount(feeGroup.getAmountPerMember() * fees.size())
                .totalPaid(totalPaid)
                .fees(fees.stream().map(this::toFeeResponse).collect(Collectors.toList()))
                .build();
    }

    // ========== 총무 관리 ==========

    @Transactional
    public void assignTreasurer(Long reunionId, String leaderUserId, String targetUserId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User leader = userRepository.findByUserId(leaderUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember leaderMember = memberRepository.findByReunionAndUser(reunion, leader)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(leaderMember.getRole())) {
            throw new RuntimeException("모임장만 총무를 지정할 수 있습니다");
        }

        // 기존 총무 해제
        memberRepository.findByReunionAndRole(reunion, ReunionMemberRole.TREASURER)
                .ifPresent(existing -> {
                    existing.setRole(ReunionMemberRole.MEMBER);
                    memberRepository.save(existing);
                });

        // 새 총무 지정
        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new RuntimeException("대상 사용자를 찾을 수 없습니다"));
        ReunionMember targetMember = memberRepository.findByReunionAndUser(reunion, target)
                .orElseThrow(() -> new RuntimeException("대상이 모임 멤버가 아닙니다"));

        if (isLeaderOrAdmin(targetMember.getRole())) {
            throw new RuntimeException("모임장은 총무로 지정할 수 없습니다");
        }

        targetMember.setRole(ReunionMemberRole.TREASURER);
        memberRepository.save(targetMember);

        notificationService.createAndSend(
                targetUserId, leaderUserId, leader.getName(),
                "REUNION_TREASURER_ASSIGNED",
                "[" + reunion.getName() + "] 총무로 지정되었습니다",
                reunion.getId()
        );
        log.info("총무 지정: {} in {}", targetUserId, reunion.getName());
    }

    @Transactional
    public void removeTreasurer(Long reunionId, String leaderUserId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User leader = userRepository.findByUserId(leaderUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember leaderMember = memberRepository.findByReunionAndUser(reunion, leader)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!isLeaderOrAdmin(leaderMember.getRole())) {
            throw new RuntimeException("모임장만 총무를 해제할 수 있습니다");
        }

        memberRepository.findByReunionAndRole(reunion, ReunionMemberRole.TREASURER)
                .ifPresent(existing -> {
                    existing.setRole(ReunionMemberRole.MEMBER);
                    memberRepository.save(existing);
                });
        log.info("총무 해제: reunion {}", reunion.getName());
    }

    // ========== 회비 그룹 ==========

    @Transactional
    public FeeGroupResponse createFeeGroup(Long reunionId, String callerUserId, CreateFeeRequest request) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        User caller = userRepository.findByUserId(callerUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember callerMember = memberRepository.findByReunionAndUser(reunion, caller)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!canManageFees(callerMember.getRole())) {
            throw new RuntimeException("모임장 또는 총무만 회비를 등록할 수 있습니다");
        }

        LocalDate dueDate = null;
        if (request.getDueDate() != null && !request.getDueDate().isEmpty()) {
            dueDate = LocalDate.parse(request.getDueDate());
        }

        FeeGroup feeGroup = FeeGroup.builder()
                .reunion(reunion)
                .description(request.getDescription())
                .amountPerMember(request.getAmount())
                .dueDate(dueDate)
                .createdBy(caller)
                .build();
        feeGroupRepository.save(feeGroup);

        List<ReunionMember> members = memberRepository.findByReunion(reunion);
        for (ReunionMember m : members) {
            ReunionFee fee = ReunionFee.builder()
                    .reunion(reunion)
                    .user(m.getUser())
                    .feeGroup(feeGroup)
                    .amount(request.getAmount())
                    .description(request.getDescription())
                    .dueDate(dueDate)
                    .createdBy(caller)
                    .build();
            feeRepository.save(fee);

            if (!m.getUser().getUserId().equals(callerUserId)) {
                notificationService.createAndSend(
                        m.getUser().getUserId(), callerUserId, caller.getName(),
                        "FEE_CREATED",
                        "[" + reunion.getName() + "] 회비 " + request.getAmount() + "원이 등록되었습니다",
                        feeGroup.getId()
                );
            }
        }

        log.info("회비 그룹 생성: {} in {}", request.getDescription(), reunion.getName());
        return toFeeGroupResponse(feeGroup);
    }

    public List<FeeGroupResponse> getFeeGroups(Long reunionId) {
        Reunion reunion = reunionRepository.findById(reunionId)
                .orElseThrow(() -> new RuntimeException("모임을 찾을 수 없습니다"));
        return feeGroupRepository.findByReunionOrderByCreatedAtDesc(reunion).stream()
                .map(this::toFeeGroupResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FeeResponse toggleFeePayment(Long feeId, String callerUserId) {
        ReunionFee fee = feeRepository.findById(feeId)
                .orElseThrow(() -> new RuntimeException("회비 정보를 찾을 수 없습니다"));
        User caller = userRepository.findByUserId(callerUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember callerMember = memberRepository.findByReunionAndUser(fee.getReunion(), caller)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!canManageFees(callerMember.getRole())) {
            throw new RuntimeException("모임장 또는 총무만 납부 처리할 수 있습니다");
        }

        if (fee.getStatus() == FeeStatus.PAID) {
            fee.setStatus(FeeStatus.UNPAID);
            fee.setPaidAmount(0);
            fee.setPaidAt(null);
        } else {
            fee.setStatus(FeeStatus.PAID);
            fee.setPaidAmount(fee.getAmount());
            fee.setPaidAt(LocalDateTime.now());
        }
        feeRepository.save(fee);

        if (!fee.getUser().getUserId().equals(callerUserId)) {
            String msg = fee.getStatus() == FeeStatus.PAID
                    ? "회비 납부가 확인되었습니다"
                    : "회비 납부가 취소되었습니다";
            notificationService.createAndSend(
                    fee.getUser().getUserId(), callerUserId, caller.getName(),
                    "FEE_UPDATED",
                    "[" + fee.getReunion().getName() + "] " + msg,
                    fee.getId()
            );
        }

        return toFeeResponse(fee);
    }

    @Transactional
    public FeeResponse addMemberToFeeGroup(Long feeGroupId, String callerUserId, String targetUserId) {
        FeeGroup feeGroup = feeGroupRepository.findById(feeGroupId)
                .orElseThrow(() -> new RuntimeException("회비 그룹을 찾을 수 없습니다"));
        User caller = userRepository.findByUserId(callerUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new RuntimeException("대상 사용자를 찾을 수 없습니다"));

        ReunionMember callerMember = memberRepository.findByReunionAndUser(feeGroup.getReunion(), caller)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!canManageFees(callerMember.getRole())) {
            throw new RuntimeException("모임장 또는 총무만 회비 멤버를 추가할 수 있습니다");
        }

        if (feeRepository.findByFeeGroupAndUser(feeGroup, target).isPresent()) {
            throw new RuntimeException("이미 이 회비에 포함된 멤버입니다");
        }

        ReunionFee fee = ReunionFee.builder()
                .reunion(feeGroup.getReunion())
                .user(target)
                .feeGroup(feeGroup)
                .amount(feeGroup.getAmountPerMember())
                .description(feeGroup.getDescription())
                .dueDate(feeGroup.getDueDate())
                .createdBy(caller)
                .build();
        feeRepository.save(fee);

        return toFeeResponse(fee);
    }

    @Transactional
    public void removeMemberFromFeeGroup(Long feeGroupId, String callerUserId, String targetUserId) {
        FeeGroup feeGroup = feeGroupRepository.findById(feeGroupId)
                .orElseThrow(() -> new RuntimeException("회비 그룹을 찾을 수 없습니다"));
        User caller = userRepository.findByUserId(callerUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new RuntimeException("대상 사용자를 찾을 수 없습니다"));

        ReunionMember callerMember = memberRepository.findByReunionAndUser(feeGroup.getReunion(), caller)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!canManageFees(callerMember.getRole())) {
            throw new RuntimeException("모임장 또는 총무만 회비 멤버를 삭제할 수 있습니다");
        }

        ReunionFee fee = feeRepository.findByFeeGroupAndUser(feeGroup, target)
                .orElseThrow(() -> new RuntimeException("해당 회비 기록을 찾을 수 없습니다"));
        feeRepository.delete(fee);
    }

    @Transactional
    public void deleteFeeGroup(Long feeGroupId, String callerUserId) {
        FeeGroup feeGroup = feeGroupRepository.findById(feeGroupId)
                .orElseThrow(() -> new RuntimeException("회비 그룹을 찾을 수 없습니다"));
        User caller = userRepository.findByUserId(callerUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        ReunionMember callerMember = memberRepository.findByReunionAndUser(feeGroup.getReunion(), caller)
                .orElseThrow(() -> new RuntimeException("모임 멤버가 아닙니다"));
        if (!canManageFees(callerMember.getRole())) {
            throw new RuntimeException("모임장 또는 총무만 회비를 삭제할 수 있습니다");
        }

        feeGroupRepository.delete(feeGroup);
        log.info("회비 그룹 삭제: {}", feeGroupId);
    }
}
