package com.ourclass.backend.service;

import com.ourclass.backend.dto.SchoolSearchResponse;
import com.ourclass.backend.entity.School;
import com.ourclass.backend.repository.SchoolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolRepository schoolRepository;

    /**
     * 학교명 자동완성 검색
     */
    public List<SchoolSearchResponse> search(String keyword, String schoolType, String region) {
        if (keyword == null || keyword.trim().length() < 2) {
            return List.of();
        }

        List<School> schools;

        if (schoolType != null && !schoolType.isBlank() && region != null && !region.isBlank()) {
            schools = schoolRepository.searchByNameAndTypeAndRegion(keyword.trim(), schoolType, region);
        } else if (schoolType != null && !schoolType.isBlank()) {
            schools = schoolRepository.searchByNameAndType(keyword.trim(), schoolType);
        } else {
            schools = schoolRepository.searchByName(keyword.trim());
        }

        return schools.stream()
                .limit(20)
                .map(SchoolSearchResponse::from)
                .toList();
    }

    /**
     * 학교 통계
     */
    public SchoolStats getStats() {
        long total = schoolRepository.count();
        long elementary = schoolRepository.countBySchoolType("초등학교");
        long middle = schoolRepository.countBySchoolType("중학교");
        long high = schoolRepository.countBySchoolType("고등학교");
        long special = schoolRepository.countBySchoolType("특수학교");
        long university = schoolRepository.countBySchoolType("대학교");
        return new SchoolStats(total, elementary, middle, high, special, university);
    }

    public record SchoolStats(long total, long elementary, long middle, long high, long special, long university) {}
}
