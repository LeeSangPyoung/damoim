package com.ourclass.backend.entity;

public enum ReunionMemberRole {
    ADMIN,      // 기존 호환 (LEADER와 동일 취급)
    LEADER,     // 모임장
    TREASURER,  // 총무
    MEMBER      // 일반 멤버
}
