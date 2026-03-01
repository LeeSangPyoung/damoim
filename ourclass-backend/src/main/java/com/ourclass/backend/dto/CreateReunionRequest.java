package com.ourclass.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreateReunionRequest {
    private String name;
    private String description;
    private String schoolCode;
    private String schoolName;
    private String graduationYear;
    private List<String> memberIds;
    private String coverImageUrl;
}
