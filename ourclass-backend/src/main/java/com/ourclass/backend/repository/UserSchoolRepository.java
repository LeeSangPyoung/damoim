package com.ourclass.backend.repository;

import com.ourclass.backend.entity.UserSchool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSchoolRepository extends JpaRepository<UserSchool, Long> {
    List<UserSchool> findBySchoolNameAndGraduationYear(String schoolName, String graduationYear);
    List<UserSchool> findBySchoolCodeAndGraduationYear(String schoolCode, String graduationYear);
}
