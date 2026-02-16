package com.ourclass.backend.repository;

import com.ourclass.backend.entity.ChatRoom;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    @Query("SELECT cr FROM ChatRoom cr WHERE (cr.user1 = :user1 AND cr.user2 = :user2) OR (cr.user1 = :user2 AND cr.user2 = :user1)")
    Optional<ChatRoom> findByUsers(@Param("user1") User user1, @Param("user2") User user2);

    @Query("SELECT cr FROM ChatRoom cr WHERE cr.user1 = :user OR cr.user2 = :user ORDER BY cr.lastMessageAt DESC NULLS LAST")
    List<ChatRoom> findByUser(@Param("user") User user);
}
