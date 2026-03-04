package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPostResponse {
    private Long id;
    private String authorUserId;
    private String authorName;
    private String content;
    private String schoolName;
    private String graduationYear;
    private String visibility;
    private int likeCount;
    private int commentCount;
    private int viewCount;
    private int imageCount;
    private String createdAt;
}
