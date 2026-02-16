package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendResponse {
    private Long friendshipId;
    private String userId;
    private String name;
    private String profileImageUrl;
    private String status; // PENDING, ACCEPTED
    private String direction; // SENT, RECEIVED (for pending)
    private String createdAt;
}
