package com.ourclass.backend.repository;

import com.ourclass.backend.entity.GroupChatMessage;
import com.ourclass.backend.entity.GroupChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupChatMessageRepository extends JpaRepository<GroupChatMessage, Long> {
    List<GroupChatMessage> findByRoomOrderBySentAtAsc(GroupChatRoom room);
}
