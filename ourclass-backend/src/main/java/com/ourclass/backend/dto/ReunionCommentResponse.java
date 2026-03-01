package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReunionCommentResponse {
    private Long id;
    private Long postId;
    private String authorUserId;
    private String authorName;
    private String authorProfileImageUrl;
    private String content;
    private String createdAt;
    private String updatedAt;
    private boolean canEdit;
    private boolean canDelete;
    private Long parentCommentId;
    private List<ReunionCommentResponse> replies;
}
