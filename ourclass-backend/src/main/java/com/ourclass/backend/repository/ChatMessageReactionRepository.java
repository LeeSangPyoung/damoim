package com.ourclass.backend.repository;

import com.ourclass.backend.entity.ChatMessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatMessageReactionRepository extends JpaRepository<ChatMessageReaction, Long> {

    List<ChatMessageReaction> findByMessageIdAndMessageSource(Long messageId, String messageSource);

    List<ChatMessageReaction> findByMessageIdInAndMessageSource(List<Long> messageIds, String messageSource);

    Optional<ChatMessageReaction> findByMessageIdAndMessageSourceAndUserIdAndEmoji(
            Long messageId, String messageSource, String userId, String emoji);

    void deleteByMessageIdAndMessageSourceAndUserIdAndEmoji(
            Long messageId, String messageSource, String userId, String emoji);
}
