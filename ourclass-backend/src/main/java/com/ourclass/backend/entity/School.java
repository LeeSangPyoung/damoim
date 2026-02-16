package com.ourclass.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "schools", indexes = {
        @Index(name = "idx_school_name", columnList = "schoolName"),
        @Index(name = "idx_school_type", columnList = "schoolType"),
        @Index(name = "idx_school_region", columnList = "region"),
        @Index(name = "idx_school_code", columnList = "schoolCode", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String schoolCode; // 표준학교코드 (SD_SCHUL_CODE)

    @Column(nullable = false, length = 10)
    private String eduOfficeCode; // 시도교육청코드 (ATPT_OFCDC_SC_CODE)

    @Column(nullable = false, length = 100)
    private String eduOfficeName; // 시도교육청명 (ATPT_OFCDC_SC_NM)

    @Column(nullable = false, length = 100)
    private String schoolName; // 학교명 (SCHUL_NM)

    @Column(length = 200)
    private String engSchoolName; // 영문학교명 (ENG_SCHUL_NM)

    @Column(nullable = false, length = 20)
    private String schoolType; // 학교종류명 (SCHUL_KND_SC_NM) - 초등학교, 중학교, 고등학교

    @Column(length = 50)
    private String region; // 소재지명 (LCTN_SC_NM)

    @Column(length = 20)
    private String foundationType; // 설립명 (FOND_SC_NM) - 공립, 사립, 국립

    @Column(length = 500)
    private String address; // 도로명주소 (ORG_RDNMA)

    @Column(length = 20)
    private String foundDate; // 설립일자 (FOND_YMD) - "19800301" 형식

    @Column(length = 20)
    private String coeducation; // 남녀공학구분명 (COEDU_SC_NM)

    @Column(length = 50)
    private String highSchoolType; // 고등학교구분명 (HS_SC_NM) - 일반고, 특목고 등

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
