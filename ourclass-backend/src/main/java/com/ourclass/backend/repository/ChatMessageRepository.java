package com.ourclass.backend.repository;

import com.ourclass.backend.entity.ChatMessage;
import com.ourclass.backend.entity.ChatRoom;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByChatRoomOrderBySentAtAsc(ChatRoom chatRoom);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatRoom = :chatRoom AND m.sender != :user AND m.isRead = false")
    long countUnreadMessages(@Param("chatRoom") ChatRoom chatRoom, @Param("user") User user);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.chatRoom = :chatRoom AND m.sender != :user AND m.isRead = false")
    void markAsRead(@Param("chatRoom") ChatRoom chatRoom, @Param("user") User user);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.chatRoom IN :chatRooms AND m.sender != :user AND m.isRead = false")
    void markAllAsRead(@Param("chatRooms") List<ChatRoom> chatRooms, @Param("user") User user);

    @Modifying
    @Query("DELETE FROM ChatMessage m WHERE m.chatRoom = :chatRoom")
    void deleteByChatRoom(@Param("chatRoom") ChatRoom chatRoom);
}
