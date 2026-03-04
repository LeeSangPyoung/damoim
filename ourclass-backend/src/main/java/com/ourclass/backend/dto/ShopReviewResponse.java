package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopReviewResponse {
    private Long id;
    private String reviewerUserId;
    private String reviewerName;
    private String reviewerProfileImageUrl;
    private Integer rating;
    private String content;
    private String createdAt;
}
