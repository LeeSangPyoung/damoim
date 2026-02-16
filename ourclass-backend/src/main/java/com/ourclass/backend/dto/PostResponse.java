package com.ourclass.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PostResponse {
    private Long id;
    private AuthorInfo author;
    private String content;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer likeCount;
    private Integer commentCount;
    private Integer viewCount;
    private Boolean liked;
    private String visibility; // SCHOOL, GRADE, CLASS
    private String targetGrade;
    private String targetClassNumber;

    @Data
    @Builder
    public static class AuthorInfo {
        private String userId;
        private String name;
        private String profileImageUrl;
        private String schoolName;
        private String graduationYear;
    }
}
