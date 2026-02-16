package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Comment;
import com.ourclass.backend.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPostOrderByCreatedAtAsc(Post post);
    long countByPost(Post post);
    void deleteAllByPost(Post post);
}
