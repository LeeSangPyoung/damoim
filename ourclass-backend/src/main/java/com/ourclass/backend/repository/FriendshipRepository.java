package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Friendship;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    // 두 사용자 간 친구 관계 조회 (방향 무관)
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester = :user1 AND f.receiver = :user2) OR " +
           "(f.requester = :user2 AND f.receiver = :user1)")
    Optional<Friendship> findByUsers(@Param("user1") User user1, @Param("user2") User user2);

    // 내 친구 목록 (수락된 것만)
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester = :user OR f.receiver = :user) AND f.status = 'ACCEPTED' " +
           "ORDER BY f.acceptedAt DESC")
    List<Friendship> findAcceptedFriendships(@Param("user") User user);

    // 받은 친구 요청 (대기 중)
    @Query("SELECT f FROM Friendship f WHERE f.receiver = :user AND f.status = 'PENDING' " +
           "ORDER BY f.createdAt DESC")
    List<Friendship> findPendingRequests(@Param("user") User user);

    // 보낸 친구 요청 (대기 중)
    @Query("SELECT f FROM Friendship f WHERE f.requester = :user AND f.status = 'PENDING' " +
           "ORDER BY f.createdAt DESC")
    List<Friendship> findSentRequests(@Param("user") User user);

    // 대기 중인 요청 수
    @Query("SELECT COUNT(f) FROM Friendship f WHERE f.receiver = :user AND f.status = 'PENDING'")
    long countPendingRequests(@Param("user") User user);

    // 특정 사용자와 여러 대상 간의 모든 친구 관계 조회 (PENDING + ACCEPTED)
    @Query("SELECT f FROM Friendship f WHERE " +
           "((f.requester = :user AND f.receiver.userId IN :targetUserIds) OR " +
           "(f.receiver = :user AND f.requester.userId IN :targetUserIds)) " +
           "AND f.status IN ('PENDING', 'ACCEPTED')")
    List<Friendship> findByUserAndTargets(@Param("user") User user, @Param("targetUserIds") List<String> targetUserIds);
}
