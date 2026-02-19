package com.ourclass.backend.service;

import com.ourclass.backend.dto.GroupChatMessageResponse;
import com.ourclass.backend.dto.GroupChatRoomResponse;
import com.ourclass.backend.entity.GroupChatMember;
import com.ourclass.backend.entity.GroupChatMessage;
import com.ourclass.backend.entity.GroupChatRoom;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GroupChatService {

    @Autowired
    private GroupChatRoomRepository roomRepository;

    @Autowired
    private GroupChatMemberRepository memberRepository;

    @Autowired
    private GroupChatMessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    // 그룹 채팅방 생성
    @Transactional
    public GroupChatRoomResponse createRoom(String creatorId, String roomName, List<String> memberIds) {
        User creator = userRepository.findByUserId(creatorId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        GroupChatRoom room = GroupChatRoom.builder()
                .name(roomName)
                .creator(creator)
                .build();
        roomRepository.save(room);

        // 생성자를 멤버로 추가
        GroupChatMember creatorMember = GroupChatMember.builder()
                .room(room)
                .user(creator)
                .build();
        memberRepository.save(creatorMember);

        // 초대된 멤버 추가
        for (String memberId : memberIds) {
            if (memberId.equals(creatorId)) continue;
            User memberUser = userRepository.findByUserId(memberId).orElse(null);
            if (memberUser != null) {
                GroupChatMember member = GroupChatMember.builder()
                        .room(room)
                        .user(memberUser)
                        .build();
                memberRepository.save(member);
            }
        }

        return toRoomResponse(room, creatorId);
    }

    // 내 그룹 채팅방 목록
    public List<GroupChatRoomResponse> getMyRooms(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        return roomRepository.findByUser(user).stream()
                .map(room -> toRoomResponse(room, userId))
                .collect(Collectors.toList());
    }

    // 메시지 보내기
    @Transactional
    public GroupChatMessageResponse sendMessage(Long roomId, String senderUserId, String content) {
        GroupChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));
        User sender = userRepository.findByUserId(senderUserId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        if (!memberRepository.existsByRoomAndUser(room, sender)) {
            throw new RuntimeException("채팅방 멤버가 아닙니다.");
        }

        GroupChatMessage message = GroupChatMessage.builder()
                .room(room)
                .sender(sender)
                .content(content)
                .build();
        messageRepository.save(message);

        room.setLastMessage(content);
        room.setLastMessageAt(LocalDateTime.now());
        roomRepository.save(room);

        // 보낸 사람 읽음 처리
        GroupChatMember senderMember = memberRepository.findByRoomAndUser(room, sender).orElse(null);
        if (senderMember != null) {
            senderMember.setLastReadMessageId(message.getId());
            memberRepository.save(senderMember);
        }

        // 다른 멤버들에게 알림
        List<GroupChatMember> members = memberRepository.findByRoom(room);
        for (GroupChatMember member : members) {
            if (!member.getUser().getUserId().equals(senderUserId)) {
                notificationService.createAndSend(
                        member.getUser().getUserId(),
                        senderUserId,
                        sender.getName(),
                        "GROUP_CHAT",
                        "[" + room.getName() + "] " + sender.getName() + "님이 메시지를 보냈습니다",
                        roomId
                );
            }
        }

        return toMessageResponse(message, room);
    }

    // 메시지 목록 조회 + 읽음 처리
    @Transactional
    public List<GroupChatMessageResponse> getMessages(Long roomId, String userId) {
        GroupChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<GroupChatMessage> messages = messageRepository.findByRoomOrderBySentAtAsc(room);

        // 마지막 메시지 ID로 읽음 처리
        if (!messages.isEmpty()) {
            Long lastMsgId = messages.get(messages.size() - 1).getId();
            GroupChatMember member = memberRepository.findByRoomAndUser(room, user).orElse(null);
            if (member != null && (member.getLastReadMessageId() == null || member.getLastReadMessageId() < lastMsgId)) {
                member.setLastReadMessageId(lastMsgId);
                memberRepository.save(member);
            }
        }

        return messages.stream()
                .filter(msg -> !msg.getCompletelyDeleted() && !msg.getDeletedByUserIds().contains(userId))
                .map(msg -> toMessageResponse(msg, room))
                .collect(Collectors.toList());
    }

    // 멤버 초대
    @Transactional
    public void inviteMember(Long roomId, String inviterId, String newMemberId) {
        GroupChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));
        User newMember = userRepository.findByUserId(newMemberId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        if (memberRepository.existsByRoomAndUser(room, newMember)) {
            throw new RuntimeException("이미 멤버입니다.");
        }

        GroupChatMember member = GroupChatMember.builder()
                .room(room)
                .user(newMember)
                .build();
        memberRepository.save(member);
    }

    // 채팅방 나가기
    @Transactional
    public void leaveRoom(Long roomId, String userId) {
        GroupChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        GroupChatMember member = memberRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> new RuntimeException("멤버가 아닙니다."));
        memberRepository.delete(member);
    }

    // 멤버 강퇴
    @Transactional
    public void kickMember(Long roomId, String requesterId, String targetUserId) {
        GroupChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없습니다."));
        userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        User target = userRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new RuntimeException("대상 사용자를 찾을 수 없습니다."));

        // 방장만 강퇴 가능
        if (!room.getCreator().getUserId().equals(requesterId)) {
            throw new RuntimeException("방장만 멤버를 강퇴할 수 있습니다.");
        }

        // 자기 자신은 강퇴 불가
        if (requesterId.equals(targetUserId)) {
            throw new RuntimeException("자기 자신을 강퇴할 수 없습니다.");
        }

        GroupChatMember member = memberRepository.findByRoomAndUser(room, target)
                .orElseThrow(() -> new RuntimeException("해당 사용자는 멤버가 아닙니다."));
        memberRepository.delete(member);
    }

    @Transactional
    public void deleteMessage(Long messageId, String userId) {
        GroupChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없습니다."));

        GroupChatRoom room = message.getRoom();

        // 메시지 발신자인지 확인
        if (!message.getSender().getUserId().equals(userId)) {
            throw new RuntimeException("자신이 보낸 메시지만 삭제할 수 있습니다.");
        }

        // 읽지 않은 사람이 있는지 확인
        int unreadCount = (int) memberRepository.countUnreadMembers(room, messageId);

        if (unreadCount > 0) {
            // 아직 안 읽은 사람이 있으면 완전히 삭제
            message.setCompletelyDeleted(true);
            messageRepository.save(message);
        } else {
            // 모두 읽었으면 내 채팅방에서만 삭제
            message.getDeletedByUserIds().add(userId);
            messageRepository.save(message);
        }
    }

    private GroupChatRoomResponse toRoomResponse(GroupChatRoom room, String currentUserId) {
        List<GroupChatMember> members = memberRepository.findByRoom(room);

        return GroupChatRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .createdBy(room.getCreator() != null ? room.getCreator().getUserId() : null)
                .memberCount(members.size())
                .members(members.stream().map(m -> GroupChatRoomResponse.MemberInfo.builder()
                        .userId(m.getUser().getUserId())
                        .name(m.getUser().getName())
                        .profileImageUrl(m.getUser().getProfileImageUrl())
                        .build()).collect(Collectors.toList()))
                .lastMessage(room.getLastMessage())
                .lastMessageAt(room.getLastMessageAt() != null ? room.getLastMessageAt().toString() : null)
                .createdAt(room.getCreatedAt() != null ? room.getCreatedAt().toString() : null)
                .build();
    }

    private GroupChatMessageResponse toMessageResponse(GroupChatMessage msg, GroupChatRoom room) {
        int unreadCount = (int) memberRepository.countUnreadMembers(room, msg.getId());
        return GroupChatMessageResponse.builder()
                .id(msg.getId())
                .roomId(msg.getRoom().getId())
                .senderUserId(msg.getSender().getUserId())
                .senderName(msg.getSender().getName())
                .content(msg.getContent())
                .unreadCount(unreadCount)
                .sentAt(msg.getSentAt() != null ? msg.getSentAt().toString() : null)
                .build();
    }
}
