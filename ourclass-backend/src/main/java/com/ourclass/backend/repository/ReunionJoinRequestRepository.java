package com.ourclass.backend.repository;

import com.ourclass.backend.entity.JoinRequestStatus;
import com.ourclass.backend.entity.Reunion;
import com.ourclass.backend.entity.ReunionJoinRequest;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReunionJoinRequestRepository extends JpaRepository<ReunionJoinRequest, Long> {
    List<ReunionJoinRequest> findByReunionAndStatus(Reunion reunion, JoinRequestStatus status);
    Optional<ReunionJoinRequest> findByReunionAndUser(Reunion reunion, User user);
    boolean existsByReunionAndUserAndStatus(Reunion reunion, User user, JoinRequestStatus status);
}
