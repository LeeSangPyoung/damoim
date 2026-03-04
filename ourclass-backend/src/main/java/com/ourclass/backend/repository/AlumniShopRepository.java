package com.ourclass.backend.repository;

import com.ourclass.backend.entity.AlumniShop;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AlumniShopRepository extends JpaRepository<AlumniShop, Long> {

    // 뷰어의 학교 코드와 겹치는 owner의 가게 조회 (동창 가게)
    @Query("SELECT DISTINCT s FROM AlumniShop s JOIN FETCH s.owner o LEFT JOIN FETCH o.schools " +
           "WHERE EXISTS (SELECT 1 FROM UserSchool us WHERE us.user = s.owner AND us.schoolCode IN :viewerSchoolCodes) " +
           "ORDER BY s.createdAt DESC")
    List<AlumniShop> findShopsForViewer(@Param("viewerSchoolCodes") List<String> viewerSchoolCodes);

    // 특정 학교 코드의 동창 가게 조회
    @Query("SELECT DISTINCT s FROM AlumniShop s JOIN FETCH s.owner o LEFT JOIN FETCH o.schools " +
           "WHERE EXISTS (SELECT 1 FROM UserSchool us WHERE us.user = s.owner AND us.schoolCode = :schoolCode) " +
           "ORDER BY s.createdAt DESC")
    List<AlumniShop> findShopsForViewerBySchoolCode(@Param("schoolCode") String schoolCode);

    @Query("SELECT s FROM AlumniShop s JOIN FETCH s.owner o LEFT JOIN FETCH o.schools WHERE s.owner = :owner ORDER BY s.createdAt DESC")
    List<AlumniShop> findByOwnerOrderByCreatedAtDesc(@Param("owner") User owner);

    @Query("SELECT s FROM AlumniShop s JOIN FETCH s.owner o LEFT JOIN FETCH o.schools WHERE s.id = :id")
    Optional<AlumniShop> findByIdWithOwnerAndSchools(@Param("id") Long id);
}
