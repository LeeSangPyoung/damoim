package com.ourclass.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatRoomResponse {
    private Long id;
    private UserInfo otherUser;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long unreadCount;

    @Data
    @Builder
    public static class UserInfo {
        private String userId;
        private String name;
        private String profileImageUrl;
    }
}
