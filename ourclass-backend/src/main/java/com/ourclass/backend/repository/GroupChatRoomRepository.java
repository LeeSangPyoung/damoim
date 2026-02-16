package com.ourclass.backend.repository;

import com.ourclass.backend.entity.GroupChatRoom;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GroupChatRoomRepository extends JpaRepository<GroupChatRoom, Long> {

    @Query("SELECT DISTINCT r FROM GroupChatRoom r JOIN r.members m WHERE m.user = :user ORDER BY r.lastMessageAt DESC NULLS LAST")
    List<GroupChatRoom> findByUser(@Param("user") User user);
}
