package com.ourclass.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class UpdatePostRequest {
    private String content;
    private List<String> imageUrls;
}
