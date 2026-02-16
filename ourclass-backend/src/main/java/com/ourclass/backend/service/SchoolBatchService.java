package com.ourclass.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ourclass.backend.entity.School;
import com.ourclass.backend.repository.SchoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchoolBatchService {

    private final SchoolRepository schoolRepository;
    private final ObjectMapper objectMapper;

    @Value("${neis.api.key:}")
    private String neisApiKey;

    @Value("${datagokr.api.key:}")
    private String dataGoKrApiKey;

    private static final String NEIS_API_URL = "https://open.neis.go.kr/hub/schoolInfo";
    private static final String UNIV_API_URL = "http://api.data.go.kr/openapi/tn_pubr_public_univ_info_api";
    private static final int PAGE_SIZE = 1000;

    // 17개 시도교육청 코드
    private static final String[] EDU_OFFICE_CODES = {
            "B10", "C10", "D10", "E10", "F10", "G10", "H10",
            "I10", "J10", "K10", "M10", "N10", "P10", "Q10",
            "R10", "S10", "T10"
    };

    @Scheduled(cron = "0 0 3 * * SUN")
    public void scheduledSync() {
        log.info("=== 학교 데이터 정기 동기화 시작 ===");
        syncAllSchools();
        syncAllUniversities();
    }

    // ─── 초/중/고 동기화 (NEIS) ───

    public SyncResult syncAllSchools() {
        if (neisApiKey == null || neisApiKey.isBlank()) {
            log.warn("NEIS API 키가 설정되지 않았습니다.");
            return new SyncResult(0, 0, 0, "NEIS API 키 미설정");
        }

        RestTemplate restTemplate = new RestTemplate();
        AtomicInteger totalInserted = new AtomicInteger(0);
        AtomicInteger totalUpdated = new AtomicInteger(0);
        AtomicInteger totalFailed = new AtomicInteger(0);

        for (String officeCode : EDU_OFFICE_CODES) {
            try {
                syncByOfficeCode(restTemplate, officeCode, totalInserted, totalUpdated, totalFailed);
                log.info("교육청 {} 동기화 완료 (누적: 신규 {}, 수정 {}, 실패 {})",
                        officeCode, totalInserted.get(), totalUpdated.get(), totalFailed.get());
            } catch (Exception e) {
                log.error("교육청 {} 동기화 실패: {}", officeCode, e.getMessage());
                totalFailed.incrementAndGet();
            }
        }

        log.info("=== 초중고 동기화 완료: 신규 {}건, 수정 {}건, 실패 {}건 ===",
                totalInserted.get(), totalUpdated.get(), totalFailed.get());
        return new SyncResult(totalInserted.get(), totalUpdated.get(), totalFailed.get(), "초중고 완료");
    }

    // ─── 대학교 동기화 (data.go.kr) ───

    public SyncResult syncAllUniversities() {
        if (dataGoKrApiKey == null || dataGoKrApiKey.isBlank()) {
            log.warn("data.go.kr API 키가 설정되지 않았습니다.");
            return new SyncResult(0, 0, 0, "data.go.kr API 키 미설정");
        }

        RestTemplate restTemplate = new RestTemplate();
        AtomicInteger totalInserted = new AtomicInteger(0);
        AtomicInteger totalUpdated = new AtomicInteger(0);
        AtomicInteger totalFailed = new AtomicInteger(0);

        int pageNo = 1;
        boolean hasMore = true;

        while (hasMore) {
            try {
                String encodedKey = URLEncoder.encode(dataGoKrApiKey, StandardCharsets.UTF_8);
                String url = String.format(
                        "%s?serviceKey=%s&pageNo=%d&numOfRows=%d&type=json",
                        UNIV_API_URL, encodedKey, pageNo, PAGE_SIZE
                );

                String response = restTemplate.getForObject(url, String.class);
                JsonNode root = objectMapper.readTree(response);

                // data.go.kr 표준 응답 구조
                JsonNode responseNode = root.path("response");
                JsonNode header = responseNode.path("header");
                String resultCode = header.path("resultCode").asText("");

                if (!"00".equals(resultCode)) {
                    log.error("대학교 API 에러: {} - {}", resultCode, header.path("resultMsg").asText(""));
                    hasMore = false;
                    continue;
                }

                JsonNode body = responseNode.path("body");
                int totalCount = body.path("totalCount").asInt(0);
                JsonNode items = body.path("items");

                if (!items.isArray() || items.isEmpty()) {
                    hasMore = false;
                    continue;
                }

                for (JsonNode item : items) {
                    try {
                        saveOrUpdateUniversity(item, totalInserted, totalUpdated);
                    } catch (Exception e) {
                        totalFailed.incrementAndGet();
                        log.debug("대학교 저장 실패: {}", e.getMessage());
                    }
                }

                int fetched = pageNo * PAGE_SIZE;
                hasMore = fetched < totalCount;
                pageNo++;

            } catch (Exception e) {
                log.error("대학교 API 호출 실패 (페이지: {}): {}", pageNo, e.getMessage());
                hasMore = false;
            }
        }

        log.info("=== 대학교 동기화 완료: 신규 {}건, 수정 {}건, 실패 {}건 ===",
                totalInserted.get(), totalUpdated.get(), totalFailed.get());
        return new SyncResult(totalInserted.get(), totalUpdated.get(), totalFailed.get(), "대학교 완료");
    }

    private void saveOrUpdateUniversity(JsonNode item,
                                         AtomicInteger totalInserted, AtomicInteger totalUpdated) {
        String schoolName = item.path("학교명").asText("");
        if (schoolName.isEmpty()) return;

        // 대학교는 별도 코드 체계: "UNIV_" + 학교명 해시
        String schoolCode = "UNIV_" + Math.abs(schoolName.hashCode());

        School school = schoolRepository.findBySchoolCode(schoolCode).orElse(null);
        boolean isNew = (school == null);

        if (isNew) {
            school = new School();
            school.setSchoolCode(schoolCode);
        }

        school.setSchoolName(schoolName);
        school.setEngSchoolName(item.path("학교영문명").asText(""));
        school.setSchoolType("대학교");
        school.setRegion(item.path("시도명").asText(""));
        school.setFoundationType(item.path("설립형태구분명").asText(""));
        school.setAddress(item.path("소재지도로명주소").asText(""));
        school.setFoundDate(item.path("설립일자").asText("").replace("-", ""));
        school.setEduOfficeCode("");
        school.setEduOfficeName(item.path("시도명").asText(""));
        school.setCoeducation("");

        // 대학구분명을 highSchoolType 필드에 저장 (대학, 전문대학, 대학원대학 등)
        String univType = item.path("대학구분명").asText("");
        school.setHighSchoolType(univType);

        schoolRepository.save(school);

        if (isNew) totalInserted.incrementAndGet();
        else totalUpdated.incrementAndGet();
    }

    // ─── 초/중/고 내부 메서드 ───

    private void syncByOfficeCode(RestTemplate restTemplate, String officeCode,
                                   AtomicInteger totalInserted, AtomicInteger totalUpdated, AtomicInteger totalFailed) {
        int pageIndex = 1;
        boolean hasMore = true;

        while (hasMore) {
            String url = String.format(
                    "%s?KEY=%s&Type=json&pIndex=%d&pSize=%d&ATPT_OFCDC_SC_CODE=%s",
                    NEIS_API_URL, neisApiKey, pageIndex, PAGE_SIZE, officeCode
            );

            try {
                String response = restTemplate.getForObject(url, String.class);
                JsonNode root = objectMapper.readTree(response);

                JsonNode schoolInfo = root.path("schoolInfo");
                if (schoolInfo.isMissingNode() || !schoolInfo.isArray() || schoolInfo.size() < 2) {
                    hasMore = false;
                    continue;
                }

                JsonNode head = schoolInfo.get(0).path("head");
                int totalCount = 0;
                if (head.isArray()) {
                    for (JsonNode headItem : head) {
                        if (headItem.has("list_total_count")) {
                            totalCount = headItem.get("list_total_count").asInt();
                            break;
                        }
                    }
                }

                JsonNode rows = schoolInfo.get(1).path("row");
                if (!rows.isArray() || rows.isEmpty()) {
                    hasMore = false;
                    continue;
                }

                for (JsonNode row : rows) {
                    try {
                        String schoolCode = row.path("SD_SCHUL_CODE").asText("");
                        if (schoolCode.isEmpty()) continue;

                        saveOrUpdateSchool(schoolCode, row, totalInserted, totalUpdated);
                    } catch (Exception e) {
                        totalFailed.incrementAndGet();
                        log.debug("학교 저장 실패: {}", e.getMessage());
                    }
                }

                int fetched = pageIndex * PAGE_SIZE;
                hasMore = fetched < totalCount;
                pageIndex++;

            } catch (Exception e) {
                log.error("API 호출 실패 (교육청: {}, 페이지: {}): {}", officeCode, pageIndex, e.getMessage());
                hasMore = false;
            }
        }
    }

    private void saveOrUpdateSchool(String schoolCode, JsonNode row,
                                     AtomicInteger totalInserted, AtomicInteger totalUpdated) {
        School school = schoolRepository.findBySchoolCode(schoolCode).orElse(null);
        boolean isNew = (school == null);

        if (isNew) {
            school = new School();
            school.setSchoolCode(schoolCode);
        }

        school.setEduOfficeCode(row.path("ATPT_OFCDC_SC_CODE").asText(""));
        school.setEduOfficeName(row.path("ATPT_OFCDC_SC_NM").asText(""));
        school.setSchoolName(row.path("SCHUL_NM").asText(""));
        school.setEngSchoolName(row.path("ENG_SCHUL_NM").asText(""));
        school.setSchoolType(row.path("SCHUL_KND_SC_NM").asText(""));
        school.setRegion(row.path("LCTN_SC_NM").asText(""));
        school.setFoundationType(row.path("FOND_SC_NM").asText(""));
        school.setAddress(row.path("ORG_RDNMA").asText(""));
        school.setFoundDate(row.path("FOND_YMD").asText(""));
        school.setCoeducation(row.path("COEDU_SC_NM").asText(""));
        school.setHighSchoolType(row.path("HS_SC_NM").asText(""));

        schoolRepository.save(school);

        if (isNew) totalInserted.incrementAndGet();
        else totalUpdated.incrementAndGet();
    }

    public record SyncResult(int inserted, int updated, int failed, String message) {}
}
