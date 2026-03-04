package com.ourclass.backend.dto;

import lombok.Data;

@Data
public class CreateShopRequest {
    private String shopName;
    private String category;
    private String subCategory;
    private String description;
    private String address;
    private String detailAddress;
    private String phone;
    private String businessHours;
    private String imageUrl;
}
