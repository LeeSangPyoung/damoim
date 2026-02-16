package com.ourclass.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private Long chatRoomId;
    private String senderUserId;
    private String senderName;
    private String content;
    private Boolean isRead;
    private LocalDateTime sentAt;
}
