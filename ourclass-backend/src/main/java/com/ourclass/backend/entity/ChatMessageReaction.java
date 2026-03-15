package com.ourclass.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_message_reactions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "message_source", "user_id", "emoji"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 메시지 ID (1:1 채팅 또는 그룹 채팅)
    @Column(name = "message_id", nullable = false)
    private Long messageId;

    // DM 또는 GROUP 구분
    @Column(name = "message_source", nullable = false, length = 10)
    private String messageSource;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(name = "user_name", nullable = false, length = 100)
    private String userName;

    @Column(nullable = false, length = 10)
    private String emoji;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
