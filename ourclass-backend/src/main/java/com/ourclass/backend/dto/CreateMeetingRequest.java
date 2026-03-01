package com.ourclass.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreateMeetingRequest {
    private String title;
    private String description;
    private List<String> dateOptions;
    private List<String> locationOptions;
}
