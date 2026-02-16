package com.ourclass.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class CommentResponse {
    private Long id;
    private Long postId;
    private AuthorInfo author;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean canDelete;
    private Boolean canEdit;

    // 대댓글 지원
    private Long parentCommentId;
    @Builder.Default
    private List<CommentResponse> replies = new ArrayList<>();

    // @멘션 지원
    @Builder.Default
    private List<MentionedUserInfo> mentionedUsers = new ArrayList<>();

    @Data
    @Builder
    public static class AuthorInfo {
        private String userId;
        private String name;
        private String profileImageUrl;
    }

    @Data
    @Builder
    public static class MentionedUserInfo {
        private String userId;
        private String name;
    }
}
