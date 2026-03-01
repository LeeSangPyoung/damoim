package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Reunion;
import com.ourclass.backend.entity.ReunionPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReunionPostRepository extends JpaRepository<ReunionPost, Long> {
    List<ReunionPost> findByReunionOrderByCreatedAtDesc(Reunion reunion);
}
