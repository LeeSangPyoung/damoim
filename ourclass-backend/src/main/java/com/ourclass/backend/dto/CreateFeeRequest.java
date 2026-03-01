package com.ourclass.backend.dto;

import lombok.Data;

@Data
public class CreateFeeRequest {
    private int amount;
    private String description;
    private String dueDate;
}
