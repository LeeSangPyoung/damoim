package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminShopResponse {
    private Long id;
    private String shopName;
    private String category;
    private String subCategory;
    private String ownerUserId;
    private String ownerName;
    private String address;
    private String phone;
    private int reviewCount;
    private Double avgRating;
    private String createdAt;
}
