package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReunionResponse {
    private Long id;
    private String name;
    private String description;
    private String schoolName;
    private String graduationYear;
    private String inviteCode;
    private String createdByUserId;
    private String createdByName;
    private int memberCount;
    private String createdAt;
}
