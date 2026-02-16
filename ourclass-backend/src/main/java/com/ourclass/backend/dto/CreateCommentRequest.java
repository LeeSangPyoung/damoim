package com.ourclass.backend.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreateCommentRequest {
    private String content;
    private Long parentCommentId; // 대댓글인 경우 부모 댓글 ID
    private List<String> mentionedUserIds = new ArrayList<>(); // @멘션된 사용자 ID 목록
}
