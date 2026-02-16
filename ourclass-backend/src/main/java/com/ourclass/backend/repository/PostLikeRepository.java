package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Post;
import com.ourclass.backend.entity.PostLike;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    boolean existsByPostAndUser(Post post, User user);
    Optional<PostLike> findByPostAndUser(Post post, User user);
    long countByPost(Post post);
    void deleteAllByPost(Post post);
}
