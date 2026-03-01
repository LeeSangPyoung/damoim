package com.ourclass.backend.controller;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.service.ReunionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reunions")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class ReunionController {

    @Autowired
    private ReunionService reunionService;

    // ========== 동창회 ==========

    @PostMapping
    public ResponseEntity<?> createReunion(@RequestParam String userId,
                                           @RequestBody CreateReunionRequest request) {
        try {
            ReunionResponse response = reunionService.createReunion(userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getMyReunions(@RequestParam String userId) {
        try {
            List<ReunionResponse> reunions = reunionService.getMyReunions(userId);
            return ResponseEntity.ok(reunions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reunionId}")
    public ResponseEntity<?> getReunionDetail(@PathVariable Long reunionId,
                                              @RequestParam String userId) {
        try {
            ReunionResponse response = reunionService.getReunionDetail(reunionId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{reunionId}/invite")
    public ResponseEntity<?> inviteMembers(@PathVariable Long reunionId,
                                           @RequestParam String userId,
                                           @RequestParam List<String> memberIds) {
        try {
            reunionService.inviteMembers(reunionId, userId, memberIds);
            return ResponseEntity.ok(Map.of("message", "초대 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{reunionId}/leave")
    public ResponseEntity<?> leaveReunion(@PathVariable Long reunionId,
                                          @RequestParam String userId) {
        try {
            reunionService.leaveReunion(reunionId, userId);
            return ResponseEntity.ok(Map.of("message", "탈퇴 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{reunionId}/members/{targetUserId}")
    public ResponseEntity<?> removeMember(@PathVariable Long reunionId,
                                          @RequestParam String userId,
                                          @PathVariable String targetUserId) {
        try {
            reunionService.removeMember(reunionId, userId, targetUserId);
            return ResponseEntity.ok(Map.of("message", "추방 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 초대 코드 + 가입 신청 ==========

    @PostMapping("/join-by-code")
    public ResponseEntity<?> joinByCode(@RequestParam String userId,
                                         @RequestParam String inviteCode) {
        try {
            ReunionResponse response = reunionService.joinByCode(userId, inviteCode);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reunionId}/join-requests")
    public ResponseEntity<?> getJoinRequests(@PathVariable Long reunionId,
                                              @RequestParam String userId) {
        try {
            List<JoinRequestResponse> requests = reunionService.getJoinRequests(reunionId, userId);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/join-requests/{requestId}/approve")
    public ResponseEntity<?> approveJoinRequest(@PathVariable Long requestId,
                                                 @RequestParam String userId) {
        try {
            reunionService.approveJoinRequest(requestId, userId);
            return ResponseEntity.ok(Map.of("message", "가입 승인 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/join-requests/{requestId}/reject")
    public ResponseEntity<?> rejectJoinRequest(@PathVariable Long requestId,
                                                @RequestParam String userId) {
        try {
            reunionService.rejectJoinRequest(requestId, userId);
            return ResponseEntity.ok(Map.of("message", "가입 거절 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{reunionId}/regenerate-code")
    public ResponseEntity<?> regenerateInviteCode(@PathVariable Long reunionId,
                                                   @RequestParam String userId) {
        try {
            String newCode = reunionService.regenerateInviteCode(reunionId, userId);
            return ResponseEntity.ok(Map.of("inviteCode", newCode));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 피드 ==========

    @PostMapping("/{reunionId}/posts")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> createPost(@PathVariable Long reunionId,
                                         @RequestParam String userId,
                                         @RequestBody Map<String, Object> request) {
        try {
            String content = (String) request.get("content");
            List<String> imageUrls = (List<String>) request.get("imageUrls");
            ReunionPostResponse response = reunionService.createPost(reunionId, userId, content, imageUrls);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reunionId}/posts")
    public ResponseEntity<?> getPosts(@PathVariable Long reunionId,
                                       @RequestParam String userId) {
        try {
            List<ReunionPostResponse> posts = reunionService.getPosts(reunionId, userId);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<?> deletePost(@PathVariable Long postId,
                                         @RequestParam String userId) {
        try {
            reunionService.deletePost(postId, userId);
            return ResponseEntity.ok(Map.of("message", "삭제 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 좋아요 ==========

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<?> toggleLike(@PathVariable Long postId,
                                         @RequestParam String userId) {
        try {
            reunionService.togglePostLike(postId, userId);
            return ResponseEntity.ok(Map.of("message", "OK"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 댓글 ==========

    @PostMapping("/posts/{postId}/comments")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> addComment(@PathVariable Long postId,
                                         @RequestParam String userId,
                                         @RequestBody Map<String, Object> request) {
        try {
            String content = (String) request.get("content");
            Long parentCommentId = request.get("parentCommentId") != null
                    ? ((Number) request.get("parentCommentId")).longValue() : null;
            var response = reunionService.addComment(postId, userId, content, parentCommentId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<?> getComments(@PathVariable Long postId,
                                          @RequestParam String userId) {
        try {
            var comments = reunionService.getComments(postId, userId);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<?> updateComment(@PathVariable Long commentId,
                                            @RequestParam String userId,
                                            @RequestBody Map<String, String> request) {
        try {
            var response = reunionService.updateComment(commentId, userId, request.get("content"));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long commentId,
                                            @RequestParam String userId) {
        try {
            reunionService.deleteComment(commentId, userId);
            return ResponseEntity.ok(Map.of("message", "삭제 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 모임 ==========

    @PostMapping("/{reunionId}/meetings")
    public ResponseEntity<?> createMeeting(@PathVariable Long reunionId,
                                           @RequestParam String userId,
                                           @RequestBody CreateMeetingRequest request) {
        try {
            MeetingResponse response = reunionService.createMeeting(reunionId, userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reunionId}/meetings")
    public ResponseEntity<?> getMeetings(@PathVariable Long reunionId,
                                         @RequestParam String userId) {
        try {
            List<MeetingResponse> meetings = reunionService.getMeetings(reunionId, userId);
            return ResponseEntity.ok(meetings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reunionId}/meetings/{meetingId}")
    public ResponseEntity<?> getMeetingDetail(@PathVariable Long reunionId,
                                              @PathVariable Long meetingId,
                                              @RequestParam String userId) {
        try {
            MeetingResponse response = reunionService.getMeetingDetail(meetingId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/meetings/vote/{optionId}")
    public ResponseEntity<?> vote(@PathVariable Long optionId,
                                  @RequestParam String userId) {
        try {
            MeetingResponse response = reunionService.vote(optionId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/meetings/{meetingId}/confirm")
    public ResponseEntity<?> confirmMeeting(@PathVariable Long meetingId,
                                            @RequestParam String userId,
                                            @RequestParam String finalDate,
                                            @RequestParam String finalLocation) {
        try {
            reunionService.confirmMeeting(meetingId, userId, finalDate, finalLocation);
            return ResponseEntity.ok(Map.of("message", "모임 확정 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/meetings/{meetingId}/cancel")
    public ResponseEntity<?> cancelMeeting(@PathVariable Long meetingId,
                                           @RequestParam String userId) {
        try {
            reunionService.cancelMeeting(meetingId, userId);
            return ResponseEntity.ok(Map.of("message", "모임 취소 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 회비 ==========

    @PostMapping("/{reunionId}/fees")
    public ResponseEntity<?> createFees(@PathVariable Long reunionId,
                                        @RequestParam String userId,
                                        @RequestBody CreateFeeRequest request) {
        try {
            List<FeeResponse> responses = reunionService.createFees(reunionId, userId, request);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reunionId}/fees")
    public ResponseEntity<?> getFees(@PathVariable Long reunionId,
                                     @RequestParam String userId) {
        try {
            List<FeeResponse> fees = reunionService.getFees(reunionId);
            return ResponseEntity.ok(fees);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{reunionId}/fees/summary")
    public ResponseEntity<?> getFeeSummary(@PathVariable Long reunionId,
                                           @RequestParam String userId) {
        try {
            FeeSummaryResponse summary = reunionService.getFeeSummary(reunionId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/fees/{feeId}/pay")
    public ResponseEntity<?> updateFeePayment(@PathVariable Long feeId,
                                              @RequestParam String userId,
                                              @RequestParam int paidAmount) {
        try {
            FeeResponse response = reunionService.updateFeePayment(feeId, userId, paidAmount);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 회비 그룹 ==========

    @GetMapping("/{reunionId}/fee-groups")
    public ResponseEntity<?> getFeeGroups(@PathVariable Long reunionId,
                                           @RequestParam String userId) {
        try {
            List<FeeGroupResponse> groups = reunionService.getFeeGroups(reunionId);
            return ResponseEntity.ok(groups);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/fees/{feeId}/toggle-paid")
    public ResponseEntity<?> toggleFeePayment(@PathVariable Long feeId,
                                               @RequestParam String userId) {
        try {
            FeeResponse response = reunionService.toggleFeePayment(feeId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/fee-groups/{feeGroupId}/members")
    public ResponseEntity<?> addMemberToFeeGroup(@PathVariable Long feeGroupId,
                                                  @RequestParam String userId,
                                                  @RequestParam String targetUserId) {
        try {
            FeeResponse response = reunionService.addMemberToFeeGroup(feeGroupId, userId, targetUserId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/fee-groups/{feeGroupId}/members/{targetUserId}")
    public ResponseEntity<?> removeMemberFromFeeGroup(@PathVariable Long feeGroupId,
                                                        @PathVariable String targetUserId,
                                                        @RequestParam String userId) {
        try {
            reunionService.removeMemberFromFeeGroup(feeGroupId, userId, targetUserId);
            return ResponseEntity.ok(Map.of("message", "회비 멤버 삭제 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/fee-groups/{feeGroupId}")
    public ResponseEntity<?> deleteFeeGroup(@PathVariable Long feeGroupId,
                                             @RequestParam String userId) {
        try {
            reunionService.deleteFeeGroup(feeGroupId, userId);
            return ResponseEntity.ok(Map.of("message", "회비 삭제 완료"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========== 총무 관리 ==========

    @PutMapping("/{reunionId}/treasurer")
    public ResponseEntity<?> assignTreasurer(@PathVariable Long reunionId,
                                              @RequestParam String userId,
                                              @RequestParam String targetUserId) {
        try {
            reunionService.assignTreasurer(reunionId, userId, targetUserId);
            return ResponseEntity.ok(Map.of("message", "총무가 지정되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{reunionId}/treasurer")
    public ResponseEntity<?> removeTreasurer(@PathVariable Long reunionId,
                                              @RequestParam String userId) {
        try {
            reunionService.removeTreasurer(reunionId, userId);
            return ResponseEntity.ok(Map.of("message", "총무가 해제되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
