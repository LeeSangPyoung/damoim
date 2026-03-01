package com.ourclass.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "meeting_vote_options")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingVoteOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private ReunionMeeting meeting;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VoteOptionType type;

    @Column(nullable = false, length = 200)
    private String optionValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "voteOption", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<MeetingVote> votes = new ArrayList<>();
}
