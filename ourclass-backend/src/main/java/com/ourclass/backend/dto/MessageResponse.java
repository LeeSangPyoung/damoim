package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private Long id;
    private UserInfo sender;
    private UserInfo receiver;
    private String content;
    private LocalDateTime sentAt;
    private LocalDateTime readAt;
    private boolean read;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private String userId;
        private String name;
        private String profileImageUrl;
    }
}
