package com.ourclass.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreatePostRequest {
    private String content;
    private List<String> imageUrls;
    private String schoolName;
    private String graduationYear;
    private String visibility; // SCHOOL, GRADE, CLASS
    private String targetGrade;
    private String targetClassNumber;
}
