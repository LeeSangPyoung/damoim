package com.ourclass.backend.service;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.entity.UserSchool;
import com.ourclass.backend.repository.UserRepository;
import com.ourclass.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        // 중복 체크
        if (userRepository.existsByUserId(request.getUserId())) {
            throw new RuntimeException("이미 사용 중인 아이디입니다");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("이미 사용 중인 이메일입니다");
        }

        // 사용자 생성
        User user = User.builder()
                .userId(request.getUserId())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .email(request.getEmail())
                .build();

        // 학교 정보 추가
        for (SignupRequest.SchoolInfo schoolInfo : request.getSchools()) {
            UserSchool userSchool = UserSchool.builder()
                    .schoolCode(schoolInfo.getSchoolCode())
                    .schoolType(schoolInfo.getSchoolType())
                    .schoolName(schoolInfo.getSchoolName())
                    .graduationYear(schoolInfo.getGraduationYear())
                    .grade(schoolInfo.getGrade())
                    .classNumber(schoolInfo.getClassNumber())
                    .build();
            user.addSchool(userSchool);
        }

        User savedUser = userRepository.save(user);
        log.info("새로운 사용자 가입: {}", savedUser.getUserId());

        // JWT 토큰 생성
        String token = jwtUtil.generateToken(savedUser.getUserId());

        return AuthResponse.builder()
                .token(token)
                .userId(savedUser.getUserId())
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        // 사용자 조회
        User user = userRepository.findByUserId(request.getUserId())
                .orElseThrow(() -> new RuntimeException("아이디 또는 비밀번호가 올바르지 않습니다"));

        // 비밀번호 확인
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("아이디 또는 비밀번호가 올바르지 않습니다");
        }

        log.info("사용자 로그인: {}", user.getUserId());

        // JWT 토큰 생성
        String token = jwtUtil.generateToken(user.getUserId());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }

    public FindIdResponse findId(FindIdRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("일치하는 회원 정보를 찾을 수 없습니다"));

        if (!user.getName().equals(request.getName())) {
            throw new RuntimeException("일치하는 회원 정보를 찾을 수 없습니다");
        }

        String maskedId = maskUserId(user.getUserId());
        log.info("아이디 찾기: {} -> {}", user.getUserId(), maskedId);

        return new FindIdResponse(maskedId);
    }

    public void verifyIdentity(String userId, String email) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("일치하는 회원 정보를 찾을 수 없습니다"));

        if (!user.getEmail().equals(email)) {
            throw new RuntimeException("일치하는 회원 정보를 찾을 수 없습니다");
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByUserId(request.getUserId())
                .orElseThrow(() -> new RuntimeException("일치하는 회원 정보를 찾을 수 없습니다"));

        if (!user.getEmail().equals(request.getEmail())) {
            throw new RuntimeException("일치하는 회원 정보를 찾을 수 없습니다");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("비밀번호 재설정: {}", user.getUserId());
    }

    private String maskUserId(String userId) {
        if (userId.length() <= 3) {
            return userId.charAt(0) + "**";
        }
        int showChars = Math.min(2, userId.length() / 3);
        String prefix = userId.substring(0, showChars);
        String suffix = userId.substring(userId.length() - showChars);
        String masked = "*".repeat(userId.length() - showChars * 2);
        return prefix + masked + suffix;
    }
}
