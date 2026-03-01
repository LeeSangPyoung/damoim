package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingResponse {
    private Long id;
    private Long reunionId;
    private String title;
    private String description;
    private String status;
    private String finalDate;
    private String finalLocation;
    private String createdByUserId;
    private String createdByName;
    private String createdAt;
    private List<VoteOptionInfo> dateOptions;
    private List<VoteOptionInfo> locationOptions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VoteOptionInfo {
        private Long id;
        private String type;
        private String optionValue;
        private int voteCount;
        private List<VoterInfo> voters;
        private boolean myVote;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VoterInfo {
        private String userId;
        private String name;
    }
}
