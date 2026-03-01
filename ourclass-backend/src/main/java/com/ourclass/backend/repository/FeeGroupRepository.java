package com.ourclass.backend.repository;

import com.ourclass.backend.entity.FeeGroup;
import com.ourclass.backend.entity.Reunion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeeGroupRepository extends JpaRepository<FeeGroup, Long> {
    List<FeeGroup> findByReunionOrderByCreatedAtDesc(Reunion reunion);
}
