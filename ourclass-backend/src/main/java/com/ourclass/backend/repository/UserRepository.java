package com.ourclass.backend.repository;

import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUserId(String userId);
    Optional<User> findByEmail(String email);
    boolean existsByUserId(String userId);
    boolean existsByEmail(String email);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN u.schools s WHERE " +
           "(:name IS NULL OR u.name LIKE %:name%) AND " +
           "(:schoolName IS NULL OR s.schoolName LIKE %:schoolName%) AND " +
           "(:graduationYear IS NULL OR s.graduationYear = :graduationYear) AND " +
           "(:grade IS NULL OR s.grade = :grade) AND " +
           "(:classNumber IS NULL OR s.classNumber = :classNumber)")
    List<User> searchUsers(@Param("name") String name,
                          @Param("schoolName") String schoolName,
                          @Param("graduationYear") String graduationYear,
                          @Param("grade") String grade,
                          @Param("classNumber") String classNumber);

    // @멘션 자동완성용: 이름 또는 userId로 검색
    @Query("SELECT u FROM User u WHERE u.name LIKE %:query% OR u.userId LIKE %:query%")
    List<User> findByNameOrUserIdContaining(@Param("query") String query);

    // @멘션된 사용자 조회: userId 목록으로 검색
    List<User> findByUserIdIn(List<String> userIds);
}
