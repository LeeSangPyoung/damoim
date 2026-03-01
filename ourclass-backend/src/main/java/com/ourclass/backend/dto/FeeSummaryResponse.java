package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeSummaryResponse {
    private int totalAmount;
    private int totalPaid;
    private int totalUnpaid;
    private int paidCount;
    private int unpaidCount;
    private int partialCount;
}
