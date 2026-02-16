package com.ourclass.backend.repository;

import com.ourclass.backend.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolRepository extends JpaRepository<School, Long> {

    Optional<School> findBySchoolCode(String schoolCode);

    // 학교명 검색 (자동완성용) - 학교종류 필터 포함
    @Query("SELECT s FROM School s WHERE s.schoolName LIKE %:keyword% AND s.schoolType = :schoolType ORDER BY s.schoolName ASC")
    List<School> searchByNameAndType(@Param("keyword") String keyword, @Param("schoolType") String schoolType);

    // 학교명 검색 (자동완성용) - 전체
    @Query("SELECT s FROM School s WHERE s.schoolName LIKE %:keyword% ORDER BY s.schoolName ASC")
    List<School> searchByName(@Param("keyword") String keyword);

    // 지역 + 학교종류 필터
    @Query("SELECT s FROM School s WHERE s.schoolName LIKE %:keyword% AND s.schoolType = :schoolType AND s.region = :region ORDER BY s.schoolName ASC")
    List<School> searchByNameAndTypeAndRegion(@Param("keyword") String keyword, @Param("schoolType") String schoolType, @Param("region") String region);

    long countBySchoolType(String schoolType);

    boolean existsBySchoolCode(String schoolCode);
}
