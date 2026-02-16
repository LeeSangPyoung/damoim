package com.ourclass.backend.repository;

import com.ourclass.backend.entity.GroupChatMember;
import com.ourclass.backend.entity.GroupChatRoom;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupChatMemberRepository extends JpaRepository<GroupChatMember, Long> {
    List<GroupChatMember> findByRoom(GroupChatRoom room);
    Optional<GroupChatMember> findByRoomAndUser(GroupChatRoom room, User user);
    boolean existsByRoomAndUser(GroupChatRoom room, User user);

    @Query("SELECT COUNT(m) FROM GroupChatMember m WHERE m.room = :room AND m.lastReadMessageId < :messageId")
    long countUnreadMembers(@Param("room") GroupChatRoom room, @Param("messageId") Long messageId);
}
