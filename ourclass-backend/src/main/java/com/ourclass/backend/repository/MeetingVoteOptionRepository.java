package com.ourclass.backend.repository;

import com.ourclass.backend.entity.MeetingVoteOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingVoteOptionRepository extends JpaRepository<MeetingVoteOption, Long> {
}
