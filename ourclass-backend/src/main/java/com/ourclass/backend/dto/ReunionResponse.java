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
public class ReunionResponse {
    private Long id;
    private String name;
    private String description;
    private String schoolCode;
    private String schoolName;
    private String graduationYear;
    private String createdByUserId;
    private String createdByName;
    private int memberCount;
    private List<MemberInfo> members;
    private String coverImageUrl;
    private String inviteCode;
    private String createdAt;
    private String myRole;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private Long memberId;
        private String userId;
        private String name;
        private String profileImageUrl;
        private String role;
        private String joinedAt;
    }
}
