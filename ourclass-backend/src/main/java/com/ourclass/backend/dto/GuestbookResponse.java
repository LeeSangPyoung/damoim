package com.ourclass.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GuestbookResponse {
    private Long id;
    private WriterInfo writer;
    private String content;
    private LocalDateTime createdAt;
    private Boolean canDelete; // 본인 또는 방명록 주인이 삭제 가능

    @Data
    @Builder
    public static class WriterInfo {
        private String userId;
        private String name;
        private String profileImageUrl;
    }
}
