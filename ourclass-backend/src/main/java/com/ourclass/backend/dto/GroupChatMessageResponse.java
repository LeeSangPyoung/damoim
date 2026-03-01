package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupChatMessageResponse {
    private Long id;
    private Long roomId;
    private String senderUserId;
    private String senderName;
    private String content;
    private String messageType;
    private int unreadCount;
    private String sentAt;
}
