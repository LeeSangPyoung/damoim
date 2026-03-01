package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Message;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    // 받은 쪽지 (삭제하지 않은 것만)
    List<Message> findByReceiverAndDeletedByReceiverFalseOrderBySentAtDesc(User receiver);

    // 보낸 쪽지 (삭제하지 않은 것만)
    List<Message> findBySenderAndDeletedBySenderFalseOrderBySentAtDesc(User sender);

    // 읽지 않은 쪽지 개수
    long countByReceiverAndReadAtIsNullAndDeletedByReceiverFalse(User receiver);

    // 받은 쪽지 일괄 읽음 처리
    @Modifying
    @Query("UPDATE Message m SET m.readAt = :now WHERE m.receiver = :receiver AND m.readAt IS NULL AND m.deletedByReceiver = false")
    void markAllAsRead(@Param("receiver") User receiver, @Param("now") LocalDateTime now);
}
