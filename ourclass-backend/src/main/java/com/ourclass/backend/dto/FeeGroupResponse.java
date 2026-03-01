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
public class FeeGroupResponse {
    private Long id;
    private Long reunionId;
    private String description;
    private int amountPerMember;
    private String dueDate;
    private String createdByUserId;
    private String createdByName;
    private String createdAt;
    private int totalMembers;
    private int paidCount;
    private int unpaidCount;
    private int totalAmount;
    private int totalPaid;
    private List<FeeResponse> fees;
}
