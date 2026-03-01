package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeResponse {
    private Long id;
    private Long reunionId;
    private Long feeGroupId;
    private String userId;
    private String userName;
    private int amount;
    private int paidAmount;
    private String status;
    private String description;
    private String dueDate;
    private String paidAt;
    private String createdAt;
}
