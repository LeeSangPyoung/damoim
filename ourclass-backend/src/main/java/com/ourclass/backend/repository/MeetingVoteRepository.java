package com.ourclass.backend.repository;

import com.ourclass.backend.entity.MeetingVote;
import com.ourclass.backend.entity.MeetingVoteOption;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MeetingVoteRepository extends JpaRepository<MeetingVote, Long> {
    Optional<MeetingVote> findByVoteOptionAndUser(MeetingVoteOption voteOption, User user);
    boolean existsByVoteOptionAndUser(MeetingVoteOption voteOption, User user);
    List<MeetingVote> findByVoteOption(MeetingVoteOption voteOption);

    @Query("SELECT v FROM MeetingVote v JOIN FETCH v.user WHERE v.voteOption.id = :optionId")
    List<MeetingVote> findByVoteOptionIdWithUser(@Param("optionId") Long optionId);

    @Query(value = "SELECT v.id as vid, u.user_id as uid, u.name as uname FROM meeting_votes v JOIN users u ON v.user_id = u.id WHERE v.vote_option_id = :optionId", nativeQuery = true)
    List<Object[]> findVotesByOptionIdNative(@Param("optionId") Long optionId);
}
