package com.ourclass.backend.controller;

import com.ourclass.backend.dto.SchoolSearchResponse;
import com.ourclass.backend.service.SchoolBatchService;
import com.ourclass.backend.service.SchoolService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schools")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class SchoolController {

    private final SchoolService schoolService;
    private final SchoolBatchService schoolBatchService;

    /**
     * 학교 검색 (자동완성)
     * GET /api/schools/search?keyword=서울&schoolType=고등학교&region=서울특별시
     */
    @GetMapping("/search")
    public ResponseEntity<List<SchoolSearchResponse>> search(
            @RequestParam String keyword,
            @RequestParam(required = false) String schoolType,
            @RequestParam(required = false) String region
    ) {
        List<SchoolSearchResponse> results = schoolService.search(keyword, schoolType, region);
        return ResponseEntity.ok(results);
    }

    /**
     * 학교 데이터 통계
     */
    @GetMapping("/stats")
    public ResponseEntity<SchoolService.SchoolStats> stats() {
        return ResponseEntity.ok(schoolService.getStats());
    }

    /**
     * 수동 동기화 트리거
     * POST /api/schools/sync
     */
    /**
     * 전체 동기화 (초중고 + 대학교)
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> sync() {
        log.info("학교 데이터 수동 동기화 요청 (전체)");
        SchoolBatchService.SyncResult schoolResult = schoolBatchService.syncAllSchools();
        SchoolBatchService.SyncResult univResult = schoolBatchService.syncAllUniversities();
        return ResponseEntity.ok(Map.of(
                "schools", Map.of(
                        "inserted", schoolResult.inserted(),
                        "updated", schoolResult.updated(),
                        "failed", schoolResult.failed(),
                        "message", schoolResult.message() != null ? schoolResult.message() : ""
                ),
                "universities", Map.of(
                        "inserted", univResult.inserted(),
                        "updated", univResult.updated(),
                        "failed", univResult.failed(),
                        "message", univResult.message() != null ? univResult.message() : ""
                )
        ));
    }

    /**
     * 대학교만 동기화
     */
    @PostMapping("/sync/universities")
    public ResponseEntity<Map<String, Object>> syncUniversities() {
        log.info("대학교 데이터 수동 동기화 요청");
        SchoolBatchService.SyncResult result = schoolBatchService.syncAllUniversities();
        return ResponseEntity.ok(Map.of(
                "inserted", result.inserted(),
                "updated", result.updated(),
                "failed", result.failed(),
                "message", result.message() != null ? result.message() : "완료"
        ));
    }
}
