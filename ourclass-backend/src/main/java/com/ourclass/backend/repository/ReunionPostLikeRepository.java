package com.ourclass.backend.repository;

import com.ourclass.backend.entity.ReunionPost;
import com.ourclass.backend.entity.ReunionPostLike;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReunionPostLikeRepository extends JpaRepository<ReunionPostLike, Long> {
    Optional<ReunionPostLike> findByReunionPostAndUser(ReunionPost reunionPost, User user);
    long countByReunionPost(ReunionPost reunionPost);
    boolean existsByReunionPostAndUser(ReunionPost reunionPost, User user);
}
