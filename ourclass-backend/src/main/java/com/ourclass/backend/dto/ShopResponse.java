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
public class ShopResponse {
    private Long id;
    private String ownerUserId;
    private String ownerName;
    private String ownerProfileImageUrl;
    private List<String> ownerSchools; // "서울중(02졸)" 형태
    private List<OwnerSchoolDetail> ownerSchoolDetails; // 정렬용 상세 학교 정보

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OwnerSchoolDetail {
        private String schoolName;
        private String graduationYear;
        private String grade;
        private String classNumber;
    }
    private String shopName;
    private String category;
    private String subCategory;
    private String description;
    private String address;
    private String detailAddress;
    private String phone;
    private String businessHours;
    private String imageUrl;
    private Double averageRating;
    private Long reviewCount;
    private String createdAt;
}
