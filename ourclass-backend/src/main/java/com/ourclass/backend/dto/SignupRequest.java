package com.ourclass.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class SignupRequest {

    @NotBlank(message = "아이디는 필수입니다")
    @Size(min = 3, max = 50, message = "아이디는 3-50자 사이여야 합니다")
    private String userId;

    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 6, message = "비밀번호는 최소 6자 이상이어야 합니다")
    private String password;

    @NotBlank(message = "이름은 필수입니다")
    @Size(max = 100, message = "이름은 100자 이하여야 합니다")
    private String name;

    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;

    @NotEmpty(message = "최소 1개 이상의 학교 정보가 필요합니다")
    @Valid
    private List<SchoolInfo> schools;

    @Data
    public static class SchoolInfo {
        private String schoolCode;

        @NotBlank(message = "학교 유형은 필수입니다")
        private String schoolType;

        @NotBlank(message = "학교명은 필수입니다")
        private String schoolName;

        @NotBlank(message = "졸업년도는 필수입니다")
        private String graduationYear;

        private String grade;
        private String classNumber;
    }
}
