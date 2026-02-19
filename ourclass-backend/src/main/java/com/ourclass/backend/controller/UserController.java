package com.ourclass.backend.controller;

import com.ourclass.backend.dto.ClassmateSearchResponse;
import com.ourclass.backend.dto.ProfileResponse;
import com.ourclass.backend.dto.ProfileUpdateRequest;
import com.ourclass.backend.dto.UserSearchRequest;
import com.ourclass.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class UserController {

    private final UserService userService;

    @GetMapping("/{userId}/profile")
    public ResponseEntity<?> getProfile(@PathVariable String userId) {
        try {
            ProfileResponse response = userService.getProfile(userId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("프로필 조회 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<?> updateProfile(
            @PathVariable String userId,
            @RequestBody ProfileUpdateRequest request) {
        try {
            ProfileResponse response = userService.updateProfile(userId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("프로필 수정 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{userId}/classmates")
    public ResponseEntity<?> searchClassmates(
            @PathVariable String userId,
            @RequestParam String schoolCode,
            @RequestParam String graduationYear) {
        try {
            ClassmateSearchResponse response = userService.searchClassmates(userId, schoolCode, graduationYear);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("동창 검색 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam String currentUserId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String schoolName,
            @RequestParam(required = false) String graduationYear,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String classNumber) {
        try {
            UserSearchRequest request = UserSearchRequest.builder()
                    .name(name)
                    .schoolName(schoolName)
                    .graduationYear(graduationYear)
                    .grade(grade)
                    .classNumber(classNumber)
                    .build();

            ClassmateSearchResponse response = userService.searchUsers(currentUserId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("사용자 검색 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
