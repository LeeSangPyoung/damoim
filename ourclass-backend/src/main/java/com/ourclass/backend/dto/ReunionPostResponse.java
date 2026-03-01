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
public class ReunionPostResponse {
    private Long id;
    private Long reunionId;
    private String authorUserId;
    private String authorName;
    private String authorProfileImageUrl;
    private String content;
    private List<String> imageUrls;
    private String createdAt;
    private long likeCount;
    private long commentCount;
    private int viewCount;
    private boolean liked;
}
