package com.ourclass.backend.service;

import com.ourclass.backend.dto.FriendResponse;
import com.ourclass.backend.entity.Friendship;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.repository.FriendshipRepository;
import com.ourclass.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class FriendService {

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    // 친구 요청 보내기
    @Transactional
    public FriendResponse sendRequest(String requesterId, String receiverId) {
        if (requesterId.equals(receiverId)) {
            throw new RuntimeException("자기 자신에게 친구 요청을 보낼 수 없습니다.");
        }

        User requester = userRepository.findByUserId(requesterId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        User receiver = userRepository.findByUserId(receiverId)
                .orElseThrow(() -> new RuntimeException("대상 사용자를 찾을 수 없습니다."));

        // 이미 관계가 있는지 확인
        Optional<Friendship> existing = friendshipRepository.findByUsers(requester, receiver);
        if (existing.isPresent()) {
            Friendship f = existing.get();
            if (f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
                throw new RuntimeException("이미 친구입니다.");
            }
            if (f.getStatus() == Friendship.FriendshipStatus.PENDING) {
                // 상대가 나에게 보낸 요청이면 자동 수락
                if (f.getReceiver().getUserId().equals(requesterId)) {
                    f.setStatus(Friendship.FriendshipStatus.ACCEPTED);
                    f.setAcceptedAt(LocalDateTime.now());
                    friendshipRepository.save(f);
                    return toResponse(f, requesterId);
                }
                throw new RuntimeException("이미 친구 요청을 보냈습니다.");
            }
            if (f.getStatus() == Friendship.FriendshipStatus.REJECTED) {
                // 거절된 경우 다시 요청 가능
                f.setRequester(requester);
                f.setReceiver(receiver);
                f.setStatus(Friendship.FriendshipStatus.PENDING);
                friendshipRepository.save(f);
                return toResponse(f, requesterId);
            }
        }

        Friendship friendship = Friendship.builder()
                .requester(requester)
                .receiver(receiver)
                .status(Friendship.FriendshipStatus.PENDING)
                .build();

        friendshipRepository.save(friendship);

        // 친구 요청 알림
        notificationService.createAndSend(
                receiverId,
                requesterId,
                requester.getName(),
                "FRIEND_REQUEST",
                requester.getName() + "님이 친구 요청을 보냈습니다",
                friendship.getId()
        );

        return toResponse(friendship, requesterId);
    }

    // 친구 요청 수락
    @Transactional
    public FriendResponse acceptRequest(Long friendshipId, String userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("친구 요청을 찾을 수 없습니다."));

        if (!friendship.getReceiver().getUserId().equals(userId)) {
            throw new RuntimeException("권한이 없습니다.");
        }

        friendship.setStatus(Friendship.FriendshipStatus.ACCEPTED);
        friendship.setAcceptedAt(LocalDateTime.now());
        friendshipRepository.save(friendship);

        // 친구 수락 알림 (요청자에게)
        User acceptor = friendship.getReceiver();
        notificationService.createAndSend(
                friendship.getRequester().getUserId(),
                userId,
                acceptor.getName(),
                "FRIEND_ACCEPTED",
                acceptor.getName() + "님이 친구 요청을 수락했습니다",
                friendshipId
        );

        return toResponse(friendship, userId);
    }

    // 친구 요청 거절 / 친구 삭제
    @Transactional
    public void removeFriendship(Long friendshipId, String userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("친구 관계를 찾을 수 없습니다."));

        if (!friendship.getRequester().getUserId().equals(userId) &&
            !friendship.getReceiver().getUserId().equals(userId)) {
            throw new RuntimeException("권한이 없습니다.");
        }

        friendshipRepository.delete(friendship);
    }

    // 내 친구 목록
    public List<FriendResponse> getMyFriends(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<Friendship> friendships = friendshipRepository.findAcceptedFriendships(user);
        List<FriendResponse> result = new ArrayList<>();
        for (Friendship f : friendships) {
            result.add(toResponse(f, userId));
        }
        return result;
    }

    // 보낸 친구 요청 목록
    public List<FriendResponse> getSentRequests(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<Friendship> requests = friendshipRepository.findSentRequests(user);
        List<FriendResponse> result = new ArrayList<>();
        for (Friendship f : requests) {
            result.add(toResponse(f, userId));
        }
        return result;
    }

    // 받은 친구 요청 목록
    public List<FriendResponse> getPendingRequests(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<Friendship> requests = friendshipRepository.findPendingRequests(user);
        List<FriendResponse> result = new ArrayList<>();
        for (Friendship f : requests) {
            result.add(toResponse(f, userId));
        }
        return result;
    }

    // 두 사용자 간 친구 상태 확인
    public Map<String, Object> getFriendshipStatus(String userId1, String userId2) {
        Map<String, Object> result = new HashMap<>();
        User user1 = userRepository.findByUserId(userId1).orElse(null);
        User user2 = userRepository.findByUserId(userId2).orElse(null);
        if (user1 == null || user2 == null) {
            result.put("status", "NONE");
            return result;
        }

        Optional<Friendship> friendship = friendshipRepository.findByUsers(user1, user2);
        if (friendship.isEmpty()) {
            result.put("status", "NONE");
            return result;
        }

        Friendship f = friendship.get();
        result.put("friendshipId", f.getId());
        if (f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
            result.put("status", "FRIEND");
        } else if (f.getStatus() == Friendship.FriendshipStatus.PENDING) {
            result.put("status", f.getRequester().getUserId().equals(userId1) ? "SENT" : "RECEIVED");
        } else {
            result.put("status", "NONE");
        }
        return result;
    }

    // 일괄 친구 상태 조회
    public Map<String, Map<String, Object>> getBatchFriendshipStatus(String userId, List<String> targetUserIds) {
        Map<String, Map<String, Object>> result = new HashMap<>();

        for (String targetId : targetUserIds) {
            Map<String, Object> none = new HashMap<>();
            none.put("status", "NONE");
            result.put(targetId, none);
        }

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) return result;

        List<Friendship> friendships = friendshipRepository.findByUserAndTargets(user, targetUserIds);
        for (Friendship f : friendships) {
            String targetUserId = f.getRequester().getUserId().equals(userId)
                    ? f.getReceiver().getUserId()
                    : f.getRequester().getUserId();

            Map<String, Object> statusMap = new HashMap<>();
            statusMap.put("friendshipId", f.getId());

            if (f.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
                statusMap.put("status", "FRIEND");
            } else if (f.getStatus() == Friendship.FriendshipStatus.PENDING) {
                statusMap.put("status", f.getRequester().getUserId().equals(userId) ? "SENT" : "RECEIVED");
            } else {
                statusMap.put("status", "NONE");
            }

            result.put(targetUserId, statusMap);
        }

        return result;
    }

    private FriendResponse toResponse(Friendship f, String currentUserId) {
        User otherUser = f.getRequester().getUserId().equals(currentUserId)
                ? f.getReceiver() : f.getRequester();

        String direction = null;
        if (f.getStatus() == Friendship.FriendshipStatus.PENDING) {
            direction = f.getRequester().getUserId().equals(currentUserId) ? "SENT" : "RECEIVED";
        }

        return FriendResponse.builder()
                .friendshipId(f.getId())
                .userId(otherUser.getUserId())
                .name(otherUser.getName())
                .profileImageUrl(otherUser.getProfileImageUrl())
                .status(f.getStatus().name())
                .direction(direction)
                .createdAt(f.getCreatedAt() != null ? f.getCreatedAt().toString() : null)
                .build();
    }
}
