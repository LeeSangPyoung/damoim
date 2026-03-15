package com.ourclass.backend.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private String content;
    private String messageType;      // TEXT, IMAGE, FILE
    private String attachmentUrl;
    private String fileName;
    private Long fileSize;
}
