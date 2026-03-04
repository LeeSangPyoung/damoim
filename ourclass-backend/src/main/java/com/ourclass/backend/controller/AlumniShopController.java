package com.ourclass.backend.controller;

import com.ourclass.backend.dto.CreateShopRequest;
import com.ourclass.backend.dto.ShopResponse;
import com.ourclass.backend.dto.ShopReviewResponse;
import com.ourclass.backend.service.AlumniShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shops")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
@RequiredArgsConstructor
public class AlumniShopController {

    private final AlumniShopService shopService;

    @PostMapping
    public ResponseEntity<?> createShop(@RequestParam String userId,
                                        @RequestBody CreateShopRequest request) {
        try {
            ShopResponse response = shopService.createShop(userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getShops(@RequestParam String userId,
                                      @RequestParam(required = false) String schoolCodes) {
        try {
            List<ShopResponse> shops = shopService.getShopsByUser(userId, schoolCodes);
            return ResponseEntity.ok(shops);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMyShops(@RequestParam String userId) {
        try {
            List<ShopResponse> shops = shopService.getMyShops(userId);
            return ResponseEntity.ok(shops);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{shopId}")
    public ResponseEntity<?> getShopDetail(@PathVariable Long shopId) {
        try {
            ShopResponse response = shopService.getShopDetail(shopId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{shopId}")
    public ResponseEntity<?> updateShop(@PathVariable Long shopId,
                                        @RequestParam String userId,
                                        @RequestBody CreateShopRequest request) {
        try {
            ShopResponse response = shopService.updateShop(shopId, userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{shopId}")
    public ResponseEntity<?> deleteShop(@PathVariable Long shopId,
                                        @RequestParam String userId) {
        try {
            shopService.deleteShop(shopId, userId);
            return ResponseEntity.ok(Map.of("message", "가게가 삭제되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // === 후기 ===

    @PostMapping("/{shopId}/reviews")
    public ResponseEntity<?> addReview(@PathVariable Long shopId,
                                       @RequestParam String userId,
                                       @RequestBody Map<String, Object> body) {
        try {
            Integer rating = (Integer) body.get("rating");
            String content = (String) body.get("content");
            ShopReviewResponse response = shopService.addReview(shopId, userId, rating, content);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{shopId}/reviews")
    public ResponseEntity<?> getReviews(@PathVariable Long shopId) {
        try {
            List<ShopReviewResponse> reviews = shopService.getReviews(shopId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<?> deleteReview(@PathVariable Long reviewId,
                                          @RequestParam String userId) {
        try {
            shopService.deleteReview(reviewId, userId);
            return ResponseEntity.ok(Map.of("message", "후기가 삭제되었습니다"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
