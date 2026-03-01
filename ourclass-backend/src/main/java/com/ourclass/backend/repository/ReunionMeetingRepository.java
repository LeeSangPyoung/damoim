package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Reunion;
import com.ourclass.backend.entity.ReunionMeeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReunionMeetingRepository extends JpaRepository<ReunionMeeting, Long> {
    List<ReunionMeeting> findByReunionOrderByCreatedAtDesc(Reunion reunion);
}
