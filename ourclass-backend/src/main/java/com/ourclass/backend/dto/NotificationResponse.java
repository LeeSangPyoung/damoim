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
public class NotificationResponse {
    private Long id;
    private String senderUserId;
    private String senderName;
    private String type;
    private String content;
    private Long referenceId;
    private boolean read;
    private LocalDateTime createdAt;
}
