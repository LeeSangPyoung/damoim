package com.ourclass.backend.repository;

import com.ourclass.backend.entity.FeeGroup;
import com.ourclass.backend.entity.FeeStatus;
import com.ourclass.backend.entity.Reunion;
import com.ourclass.backend.entity.ReunionFee;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReunionFeeRepository extends JpaRepository<ReunionFee, Long> {
    List<ReunionFee> findByReunionOrderByCreatedAtDesc(Reunion reunion);
    long countByReunionAndStatus(Reunion reunion, FeeStatus status);
    List<ReunionFee> findByFeeGroup(FeeGroup feeGroup);
    Optional<ReunionFee> findByFeeGroupAndUser(FeeGroup feeGroup, User user);
    long countByFeeGroupAndStatus(FeeGroup feeGroup, FeeStatus status);
}
