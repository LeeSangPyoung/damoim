package com.ourclass.backend.dto;

import com.ourclass.backend.entity.School;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolSearchResponse {

    private Long id;
    private String schoolCode;
    private String schoolName;
    private String schoolType;
    private String region;
    private String address;
    private String foundationType;
    private String foundDate;
    private String coeducation;
    private String highSchoolType;

    // 설립일 기준 졸업 가능 시작년도
    private Integer graduationYearFrom;

    public static SchoolSearchResponse from(School school) {
        Integer gradYearFrom = null;
        if (school.getFoundDate() != null && school.getFoundDate().length() >= 4) {
            try {
                int foundYear = Integer.parseInt(school.getFoundDate().substring(0, 4));
                // 학교 유형에 따라 최소 졸업까지 걸리는 햇수
                int yearsToGraduate = switch (school.getSchoolType()) {
                    case "초등학교" -> 6;
                    case "중학교", "고등학교" -> 3;
                    default -> 3;
                };
                gradYearFrom = foundYear + yearsToGraduate;
            } catch (NumberFormatException ignored) {
            }
        }

        return SchoolSearchResponse.builder()
                .id(school.getId())
                .schoolCode(school.getSchoolCode())
                .schoolName(school.getSchoolName())
                .schoolType(school.getSchoolType())
                .region(school.getRegion())
                .address(school.getAddress())
                .foundationType(school.getFoundationType())
                .foundDate(school.getFoundDate())
                .coeducation(school.getCoeducation())
                .highSchoolType(school.getHighSchoolType())
                .graduationYearFrom(gradYearFrom)
                .build();
    }
}
