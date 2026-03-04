package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCommentResponse {
    private Long id;
    private Long postId;
    private String postContentPreview;
    private String authorUserId;
    private String authorName;
    private String content;
    private boolean isReply;
    private String createdAt;
}
