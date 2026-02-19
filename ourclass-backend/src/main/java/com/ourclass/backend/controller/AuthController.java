package com.ourclass.backend.controller;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://192.168.45.23:3001"})
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        try {
            AuthResponse response = authService.signup(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("회원가입 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("로그인 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/find-id")
    public ResponseEntity<?> findId(@Valid @RequestBody FindIdRequest request) {
        try {
            FindIdResponse response = authService.findId(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("아이디 찾기 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify-identity")
    public ResponseEntity<?> verifyIdentity(@RequestBody java.util.Map<String, String> request) {
        try {
            authService.verifyIdentity(request.get("userId"), request.get("email"));
            return ResponseEntity.ok("본인 확인 성공");
        } catch (RuntimeException e) {
            log.error("본인 확인 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request);
            return ResponseEntity.ok("비밀번호가 변경되었습니다");
        } catch (RuntimeException e) {
            log.error("비밀번호 재설정 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody java.util.Map<String, String> request) {
        try {
            authService.logout(request.get("userId"));
            return ResponseEntity.ok("로그아웃 성공");
        } catch (RuntimeException e) {
            log.error("로그아웃 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestBody java.util.Map<String, String> request) {
        try {
            authService.updateActivity(request.get("userId"));
            return ResponseEntity.ok("활동 시간 업데이트 성공");
        } catch (RuntimeException e) {
            log.error("활동 시간 업데이트 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
