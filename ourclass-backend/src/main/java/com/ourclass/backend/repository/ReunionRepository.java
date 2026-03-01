package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Reunion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReunionRepository extends JpaRepository<Reunion, Long> {

    @Query("SELECT DISTINCT r FROM Reunion r JOIN r.members m WHERE m.user.userId = :userId ORDER BY r.createdAt DESC")
    List<Reunion> findByMemberUserId(@Param("userId") String userId);

    Optional<Reunion> findByInviteCode(String inviteCode);
}
