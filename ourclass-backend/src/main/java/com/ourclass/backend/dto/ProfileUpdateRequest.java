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
public class ProfileUpdateRequest {
    private String name;
    private String profileImageUrl;
    private String bio;
    private List<SchoolInfo> schools;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SchoolInfo {
        private String schoolCode;
        private String schoolType;
        private String schoolName;
        private String graduationYear;
        private String grade;
        private String classNumber;
    }
}
