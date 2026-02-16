package com.ourclass.backend.repository;

import com.ourclass.backend.entity.Post;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    // 우리 학교: 같은 학교명으로 작성된 게시글 (post.schoolName 기준)
    @Query("SELECT p FROM Post p WHERE p.schoolName = :schoolName ORDER BY p.createdAt DESC")
    List<Post> findBySchoolName(@Param("schoolName") String schoolName);

    // 우리 학년: 같은 학교 + 같은 졸업년도, 작성자의 학년까지 매칭
    @Query("SELECT DISTINCT p FROM Post p JOIN p.author.schools s " +
           "WHERE p.schoolName = :schoolName AND p.graduationYear = :graduationYear AND s.schoolName = :schoolName AND s.grade = :grade " +
           "ORDER BY p.createdAt DESC")
    List<Post> findBySchoolAndYearAndGrade(
        @Param("schoolName") String schoolName,
        @Param("graduationYear") String graduationYear,
        @Param("grade") String grade
    );

    // 우리 반: 같은 학교 + 같은 졸업년도 + 같은 학년 + 같은 반
    @Query("SELECT DISTINCT p FROM Post p JOIN p.author.schools s " +
           "WHERE p.schoolName = :schoolName AND p.graduationYear = :graduationYear AND s.schoolName = :schoolName AND s.grade = :grade AND s.classNumber = :classNumber " +
           "ORDER BY p.createdAt DESC")
    List<Post> findBySchoolAndYearAndGradeAndClass(
        @Param("schoolName") String schoolName,
        @Param("graduationYear") String graduationYear,
        @Param("grade") String grade,
        @Param("classNumber") String classNumber
    );

    // 새 글 수 조회 (afterId 이후)
    @Query("SELECT COUNT(p) FROM Post p WHERE p.schoolName = :schoolName AND p.id > :afterId")
    long countNewBySchoolName(@Param("schoolName") String schoolName, @Param("afterId") Long afterId);

    @Query("SELECT COUNT(DISTINCT p) FROM Post p JOIN p.author.schools s " +
           "WHERE p.schoolName = :schoolName AND p.graduationYear = :graduationYear AND s.schoolName = :schoolName AND s.grade = :grade AND p.id > :afterId")
    long countNewBySchoolAndYearAndGrade(@Param("schoolName") String schoolName, @Param("graduationYear") String graduationYear, @Param("grade") String grade, @Param("afterId") Long afterId);

    @Query("SELECT COUNT(DISTINCT p) FROM Post p JOIN p.author.schools s " +
           "WHERE p.schoolName = :schoolName AND p.graduationYear = :graduationYear AND s.schoolName = :schoolName AND s.grade = :grade AND s.classNumber = :classNumber AND p.id > :afterId")
    long countNewBySchoolAndYearAndGradeAndClass(@Param("schoolName") String schoolName, @Param("graduationYear") String graduationYear, @Param("grade") String grade, @Param("classNumber") String classNumber, @Param("afterId") Long afterId);

    // 작성자로 조회
    List<Post> findByAuthorOrderByCreatedAtDesc(User author);

    // schoolName이 null인 기존 게시글 조회 (마이그레이션용)
    @Query("SELECT p FROM Post p WHERE p.schoolName IS NULL")
    List<Post> findBySchoolNameIsNull();
}
