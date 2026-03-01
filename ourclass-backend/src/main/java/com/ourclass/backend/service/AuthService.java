package com.ourclass.backend.service;

import com.ourclass.backend.dto.*;
import com.ourclass.backend.entity.Friendship;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.entity.UserSchool;
import com.ourclass.backend.repository.FriendshipRepository;
import com.ourclass.backend.repository.UserRepository;
import com.ourclass.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final SimpMessagingTemplate messagingTemplate;
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
        User.UserBuilder userBuilder = User.builder()
                .userId(request.getUserId())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .email(request.getEmail());

        // admin 아이디로 가입하면 자동으로 ADMIN 권한 부여
        if ("admin".equals(request.getUserId())) {
            userBuilder.role(com.ourclass.backend.entity.UserRole.ADMIN);
        }

        User user = userBuilder.build();

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
                .role(savedUser.getRole().name())
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // 사용자 조회
        User user = userRepository.findByUserId(request.getUserId())
                .orElseThrow(() -> new RuntimeException("아이디 또는 비밀번호가 올바르지 않습니다"));

        // 비밀번호 확인
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("아이디 또는 비밀번호가 올바르지 않습니다");
        }

        // 로그인 시간 및 활동 시간 업데이트
        LocalDateTime now = LocalDateTime.now();
        user.setLastLoginTime(now);
        user.setLastActivityTime(now);
        userRepository.save(user);

        log.info("사용자 로그인: {}", user.getUserId());

        // 친구들에게 로그인 알림 전송 (WebSocket)
        try {
            List<Friendship> friendships = friendshipRepository.findAcceptedFriendships(user);
            log.info("로그인 알림: {}의 친구 수 = {}", user.getUserId(), friendships.size());
            for (Friendship f : friendships) {
                String friendUserId = f.getRequester().getUserId().equals(user.getUserId())
                        ? f.getReceiver().getUserId()
                        : f.getRequester().getUserId();
                log.info("로그인 알림 전송: {} -> {}", user.getUserId(), friendUserId);
                messagingTemplate.convertAndSend(
                        "/topic/login/" + friendUserId,
                        Map.of(
                                "userId", user.getUserId(),
                                "name", user.getName(),
                                "profileImageUrl", user.getProfileImageUrl() != null ? user.getProfileImageUrl() : ""
                        )
                );
            }
        } catch (Exception e) {
            log.warn("로그인 알림 전송 실패: {}", e.getMessage(), e);
        }

        // JWT 토큰 생성
        String token = jwtUtil.generateToken(user.getUserId());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
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

    @Transactional
    public void logout(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        user.setLastLogoutTime(LocalDateTime.now());
        userRepository.save(user);
        log.info("사용자 로그아웃: {}", user.getUserId());
    }

    @Transactional
    public void updateActivity(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        user.setLastActivityTime(LocalDateTime.now());
        userRepository.save(user);
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
