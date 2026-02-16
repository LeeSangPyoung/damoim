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
public class ProfileResponse {
    private Long id;
    private String userId;
    private String name;
    private String email;
    private String profileImageUrl;
    private String bio;
    private List<SchoolInfo> schools;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SchoolInfo {
        private Long id;
        private String schoolCode;
        private String schoolType;
        private String schoolName;
        private String graduationYear;
        private String grade;
        private String classNumber;
    }
}
