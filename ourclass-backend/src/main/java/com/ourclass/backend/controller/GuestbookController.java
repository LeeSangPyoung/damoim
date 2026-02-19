package com.ourclass.backend.controller;

import com.ourclass.backend.dto.GuestbookRequest;
import com.ourclass.backend.dto.GuestbookResponse;
import com.ourclass.backend.service.GuestbookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/guestbook")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class GuestbookController {

    @Autowired
    private GuestbookService guestbookService;

    // 방명록 작성
    @PostMapping("/{ownerUserId}")
    public ResponseEntity<?> addEntry(
            @PathVariable String ownerUserId,
            @RequestParam String writerId,
            @RequestBody GuestbookRequest request) {
        try {
            GuestbookResponse response = guestbookService.addEntry(ownerUserId, writerId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 방명록 목록 조회
    @GetMapping("/{ownerUserId}")
    public ResponseEntity<?> getEntries(
            @PathVariable String ownerUserId,
            @RequestParam(required = false) String currentUserId) {
        try {
            List<GuestbookResponse> entries = guestbookService.getEntries(ownerUserId, currentUserId);
            return ResponseEntity.ok(entries);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 방명록 삭제
    @DeleteMapping("/{entryId}")
    public ResponseEntity<?> deleteEntry(
            @PathVariable Long entryId,
            @RequestParam String userId) {
        try {
            guestbookService.deleteEntry(entryId, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
