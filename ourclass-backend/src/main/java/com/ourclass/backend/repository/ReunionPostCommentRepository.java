package com.ourclass.backend.repository;

import com.ourclass.backend.entity.ReunionPost;
import com.ourclass.backend.entity.ReunionPostComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReunionPostCommentRepository extends JpaRepository<ReunionPostComment, Long> {
    List<ReunionPostComment> findByReunionPostAndParentCommentIsNullOrderByCreatedAtAsc(ReunionPost reunionPost);
    long countByReunionPost(ReunionPost reunionPost);
}
