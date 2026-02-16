package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Guestbook;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GuestbookRepository extends JpaRepository<Guestbook, Long> {
    List<Guestbook> findByOwnerOrderByCreatedAtDesc(User owner);
    long countByOwner(User owner);
}
