package com.ourclass.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FindIdResponse {
    private String maskedUserId;
}
