package com.ourclass.backend.service;

import com.ourclass.backend.dto.ClassmateSearchResponse;
import com.ourclass.backend.dto.ProfileResponse;
import com.ourclass.backend.dto.ProfileUpdateRequest;
import com.ourclass.backend.dto.UserSearchRequest;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.entity.UserSchool;
import com.ourclass.backend.repository.UserRepository;
import com.ourclass.backend.repository.UserSchoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserSchoolRepository userSchoolRepository;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        return ProfileResponse.builder()
                .id(user.getId())
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .bio(user.getBio())
                .schools(user.getSchools().stream()
                        .map(school -> ProfileResponse.SchoolInfo.builder()
                                .id(school.getId())
                                .schoolCode(school.getSchoolCode())
                                .schoolType(school.getSchoolType())
                                .schoolName(school.getSchoolName())
                                .graduationYear(school.getGraduationYear())
                                .grade(school.getGrade())
                                .classNumber(school.getClassNumber())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    @Transactional
    public ProfileResponse updateProfile(String userId, ProfileUpdateRequest request) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getProfileImageUrl() != null) {
            user.setProfileImageUrl(request.getProfileImageUrl());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        // 학교 정보 업데이트
        if (request.getSchools() != null && !request.getSchools().isEmpty()) {
            user.getSchools().clear();
            for (ProfileUpdateRequest.SchoolInfo schoolInfo : request.getSchools()) {
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
        }

        User updatedUser = userRepository.save(user);

        return ProfileResponse.builder()
                .id(updatedUser.getId())
                .userId(updatedUser.getUserId())
                .name(updatedUser.getName())
                .email(updatedUser.getEmail())
                .profileImageUrl(updatedUser.getProfileImageUrl())
                .bio(updatedUser.getBio())
                .schools(updatedUser.getSchools().stream()
                        .map(school -> ProfileResponse.SchoolInfo.builder()
                                .id(school.getId())
                                .schoolCode(school.getSchoolCode())
                                .schoolType(school.getSchoolType())
                                .schoolName(school.getSchoolName())
                                .graduationYear(school.getGraduationYear())
                                .grade(school.getGrade())
                                .classNumber(school.getClassNumber())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    @Transactional(readOnly = true)
    public ClassmateSearchResponse searchClassmates(String userId, String schoolCode, String graduationYear) {
        // schoolCode 기반으로 같은 학교/졸업년도의 학생들 찾기
        List<UserSchool> schools = userSchoolRepository
                .findBySchoolCodeAndGraduationYear(schoolCode, graduationYear);

        List<ClassmateSearchResponse.ClassmateInfo> classmates = schools.stream()
                .map(UserSchool::getUser)
                .distinct()
                .filter(user -> !user.getUserId().equals(userId)) // 본인 제외
                .map(user -> {
                    // 해당 학교 정보만 추출
                    UserSchool matchedSchool = user.getSchools().stream()
                            .filter(s -> schoolCode.equals(s.getSchoolCode())
                                    && s.getGraduationYear().equals(graduationYear))
                            .findFirst()
                            .orElse(null);

                    return ClassmateSearchResponse.ClassmateInfo.builder()
                            .id(user.getId())
                            .userId(user.getUserId())
                            .name(user.getName())
                            .profileImageUrl(user.getProfileImageUrl())
                            .bio(user.getBio())
                            .school(matchedSchool != null ? ClassmateSearchResponse.SchoolInfo.builder()
                                    .schoolCode(matchedSchool.getSchoolCode())
                                    .schoolType(matchedSchool.getSchoolType())
                                    .schoolName(matchedSchool.getSchoolName())
                                    .graduationYear(matchedSchool.getGraduationYear())
                                    .grade(matchedSchool.getGrade())
                                    .classNumber(matchedSchool.getClassNumber())
                                    .build() : null)
                            .build();
                })
                .collect(Collectors.toList());

        return ClassmateSearchResponse.builder()
                .classmates(classmates)
                .totalCount(classmates.size())
                .build();
    }

    @Transactional(readOnly = true)
    public ClassmateSearchResponse searchUsers(String currentUserId, UserSearchRequest request) {
        // 빈 문자열을 null로 변환
        String name = (request.getName() != null && !request.getName().trim().isEmpty()) ? request.getName() : null;
        String schoolName = (request.getSchoolName() != null && !request.getSchoolName().trim().isEmpty()) ? request.getSchoolName() : null;
        String graduationYear = (request.getGraduationYear() != null && !request.getGraduationYear().trim().isEmpty()) ? request.getGraduationYear() : null;
        String grade = (request.getGrade() != null && !request.getGrade().trim().isEmpty()) ? request.getGrade() : null;
        String classNumber = (request.getClassNumber() != null && !request.getClassNumber().trim().isEmpty()) ? request.getClassNumber() : null;

        log.info("검색 조건 - name: {}, schoolName: {}, graduationYear: {}, grade: {}, classNumber: {}",
                name, schoolName, graduationYear, grade, classNumber);

        // 검색 조건에 맞는 사용자 찾기
        List<User> users = userRepository.searchUsers(name, schoolName, graduationYear, grade, classNumber);

        log.info("검색 결과: {} 명", users.size());

        List<ClassmateSearchResponse.ClassmateInfo> results = users.stream()
                .filter(user -> !user.getUserId().equals(currentUserId)) // 본인 제외
                .map(user -> {
                    // 첫 번째 학교 정보를 기본으로 사용
                    UserSchool firstSchool = user.getSchools().isEmpty() ? null : user.getSchools().get(0);

                    return ClassmateSearchResponse.ClassmateInfo.builder()
                            .id(user.getId())
                            .userId(user.getUserId())
                            .name(user.getName())
                            .profileImageUrl(user.getProfileImageUrl())
                            .bio(user.getBio())
                            .school(firstSchool != null ? ClassmateSearchResponse.SchoolInfo.builder()
                                    .schoolCode(firstSchool.getSchoolCode())
                                    .schoolType(firstSchool.getSchoolType())
                                    .schoolName(firstSchool.getSchoolName())
                                    .graduationYear(firstSchool.getGraduationYear())
                                    .grade(firstSchool.getGrade())
                                    .classNumber(firstSchool.getClassNumber())
                                    .build() : null)
                            .build();
                })
                .collect(Collectors.toList());

        return ClassmateSearchResponse.builder()
                .classmates(results)
                .totalCount(results.size())
                .build();
    }
}
