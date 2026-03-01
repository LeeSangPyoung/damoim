package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinRequestResponse {
    private Long id;
    private Long reunionId;
    private String userId;
    private String userName;
    private String profileImageUrl;
    private String status;
    private String requestedAt;
    private String processedAt;
}
