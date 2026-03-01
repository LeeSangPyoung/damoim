package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Reunion;
import com.ourclass.backend.entity.ReunionMember;
import com.ourclass.backend.entity.ReunionMemberRole;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReunionMemberRepository extends JpaRepository<ReunionMember, Long> {
    List<ReunionMember> findByReunion(Reunion reunion);
    Optional<ReunionMember> findByReunionAndUser(Reunion reunion, User user);
    boolean existsByReunionAndUser(Reunion reunion, User user);
    Optional<ReunionMember> findByReunionAndRole(Reunion reunion, ReunionMemberRole role);
}
