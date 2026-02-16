package com.ourclass.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_schools")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSchool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 20)
    private String schoolCode; // 학교 마스터 코드 (schools 테이블의 schoolCode)

    @Column(nullable = false, length = 20)
    private String schoolType; // 초등학교, 중학교, 고등학교, 대학교

    @Column(nullable = false, length = 100)
    private String schoolName;

    @Column(nullable = false, length = 4)
    private String graduationYear;

    @Column(length = 2)
    private String grade; // 학년

    @Column(length = 10)
    private String classNumber; // 반
}
