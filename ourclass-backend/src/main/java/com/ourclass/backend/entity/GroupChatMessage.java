package com.ourclass.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "group_chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private GroupChatRoom room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, length = 2000)
    private String content;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime sentAt;

    // 메시지를 삭제한 사용자 ID 목록 (카카오톡 스타일: 내 채팅방에서만 삭제)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "group_chat_message_deleted_by", joinColumns = @JoinColumn(name = "message_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<String> deletedByUserIds = new HashSet<>();

    // 메시지가 완전히 삭제되었는지 (모두에게서 사라짐)
    @Column(nullable = false)
    @Builder.Default
    private Boolean completelyDeleted = false;
}
