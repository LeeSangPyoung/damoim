package com.ourclass.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private Long chatRoomId;
    private String senderUserId;
    private String senderName;
    private String content;
    private String messageType;      // TEXT, IMAGE, FILE
    private String attachmentUrl;
    private String fileName;
    private Long fileSize;
    private Boolean isRead;
    private LocalDateTime sentAt;
    private Boolean completelyDeleted;
    private Boolean deletedBySender;
    private List<ReactionResponse> reactions;
}
