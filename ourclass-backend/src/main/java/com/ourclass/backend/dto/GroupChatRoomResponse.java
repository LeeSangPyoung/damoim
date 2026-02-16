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
public class GroupChatRoomResponse {
    private Long id;
    private String name;
    private String createdBy;
    private int memberCount;
    private List<MemberInfo> members;
    private String lastMessage;
    private String lastMessageAt;
    private String createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberInfo {
        private String userId;
        private String name;
        private String profileImageUrl;
    }
}
