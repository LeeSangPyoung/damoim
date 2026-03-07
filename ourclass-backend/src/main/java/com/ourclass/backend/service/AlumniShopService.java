package com.ourclass.backend.service;

import com.ourclass.backend.dto.CreateShopRequest;
import com.ourclass.backend.dto.ShopResponse;
import com.ourclass.backend.dto.ShopReviewResponse;
import com.ourclass.backend.entity.AlumniShop;
import com.ourclass.backend.entity.AlumniShopReview;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.entity.UserSchool;
import com.ourclass.backend.repository.AlumniShopRepository;
import com.ourclass.backend.repository.AlumniShopReviewRepository;
import com.ourclass.backend.repository.UserRepository;
import com.ourclass.backend.repository.UserSchoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlumniShopService {

    private final AlumniShopRepository shopRepository;
    private final AlumniShopReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final UserSchoolRepository userSchoolRepository;
    private final NotificationService notificationService;

    @Transactional
    public ShopResponse createShop(String userId, CreateShopRequest request) {
        User owner = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        if (owner.getSchools() == null || owner.getSchools().isEmpty()) {
            throw new RuntimeException("등록된 모교가 없습니다. 프로필에서 학교를 먼저 등록해주세요.");
        }

        AlumniShop shop = AlumniShop.builder()
                .owner(owner)
                .shopName(request.getShopName())
                .category(request.getCategory())
                .subCategory(request.getSubCategory())
                .description(request.getDescription())
                .address(request.getAddress())
                .detailAddress(request.getDetailAddress())
                .phone(request.getPhone())
                .businessHours(request.getBusinessHours())
                .imageUrl(request.getImageUrl())
                .build();

        shopRepository.save(shop);
        log.info("동창 가게 등록: {} by {}", shop.getShopName(), userId);

        // 같은 학교 동창들에게 알림 전송
        try {
            Set<String> notified = new HashSet<>();
            notified.add(userId); // 본인 제외
            for (UserSchool us : owner.getSchools()) {
                List<UserSchool> classmates = userSchoolRepository.findBySchoolCodeAndGraduationYear(
                        us.getSchoolCode(), us.getGraduationYear());
                for (UserSchool cm : classmates) {
                    String cmUserId = cm.getUser().getUserId();
                    if (!notified.contains(cmUserId)) {
                        notified.add(cmUserId);
                        notificationService.createAndSend(
                                cmUserId, userId, owner.getName(),
                                "NEW_SHOP",
                                owner.getName() + "님이 동창가게에 '" + shop.getShopName() + "'을(를) 등록했어요!",
                                shop.getId()
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.warn("가게 등록 알림 전송 실패: {}", e.getMessage());
        }

        return toShopResponse(shop);
    }

    @Transactional(readOnly = true)
    public List<ShopResponse> getShopsByUser(String userId, String schoolCodesParam) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        // 사용자의 전체 학교 코드
        List<String> userSchoolCodes = user.getSchools().stream()
                .map(UserSchool::getSchoolCode)
                .distinct()
                .collect(Collectors.toList());

        if (userSchoolCodes.isEmpty()) {
            return List.of();
        }

        // 특정 학교 코드들로 필터링 (쉼표 구분)
        List<String> filterCodes;
        if (schoolCodesParam != null && !schoolCodesParam.isEmpty()) {
            Set<String> requestedCodes = new HashSet<>(Arrays.asList(schoolCodesParam.split(",")));
            filterCodes = userSchoolCodes.stream()
                    .filter(requestedCodes::contains)
                    .collect(Collectors.toList());
        } else {
            filterCodes = userSchoolCodes;
        }

        if (filterCodes.isEmpty()) {
            return List.of();
        }

        return shopRepository.findShopsForViewer(filterCodes)
                .stream()
                .map(this::toShopResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShopResponse> getMyShops(String userId) {
        User owner = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        return shopRepository.findByOwnerOrderByCreatedAtDesc(owner)
                .stream()
                .map(this::toShopResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ShopResponse getShopDetail(Long shopId) {
        AlumniShop shop = shopRepository.findByIdWithOwnerAndSchools(shopId)
                .orElseThrow(() -> new RuntimeException("가게를 찾을 수 없습니다"));

        return toShopResponse(shop);
    }

    @Transactional
    public ShopResponse updateShop(Long shopId, String userId, CreateShopRequest request) {
        AlumniShop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("가게를 찾을 수 없습니다"));

        if (!shop.getOwner().getUserId().equals(userId)) {
            throw new RuntimeException("본인의 가게만 수정할 수 있습니다");
        }

        shop.setShopName(request.getShopName());
        shop.setCategory(request.getCategory());
        shop.setSubCategory(request.getSubCategory());
        shop.setDescription(request.getDescription());
        shop.setAddress(request.getAddress());
        shop.setDetailAddress(request.getDetailAddress());
        shop.setPhone(request.getPhone());
        shop.setBusinessHours(request.getBusinessHours());
        shop.setImageUrl(request.getImageUrl());

        shopRepository.save(shop);
        log.info("동창 가게 수정: {} by {}", shop.getShopName(), userId);

        return toShopResponse(shop);
    }

    @Transactional
    public void deleteShop(Long shopId, String userId) {
        AlumniShop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("가게를 찾을 수 없습니다"));

        if (!shop.getOwner().getUserId().equals(userId)) {
            throw new RuntimeException("본인의 가게만 삭제할 수 있습니다");
        }

        shopRepository.delete(shop);
        log.info("동창 가게 삭제: {} by {}", shop.getShopName(), userId);
    }

    // === 후기 ===

    @Transactional
    public ShopReviewResponse addReview(Long shopId, String userId, Integer rating, String content) {
        AlumniShop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("가게를 찾을 수 없습니다"));

        User reviewer = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));

        if (shop.getOwner().getUserId().equals(userId)) {
            throw new RuntimeException("본인 가게에는 후기를 작성할 수 없습니다");
        }

        if (reviewRepository.existsByShopIdAndReviewerId(shop.getId(), reviewer.getId())) {
            throw new RuntimeException("이미 후기를 작성하셨습니다");
        }

        AlumniShopReview review = AlumniShopReview.builder()
                .shop(shop)
                .reviewer(reviewer)
                .rating(rating)
                .content(content)
                .build();

        reviewRepository.save(review);
        log.info("가게 후기 작성: shop={} by {}", shopId, userId);

        return toReviewResponse(review);
    }

    @Transactional(readOnly = true)
    public List<ShopReviewResponse> getReviews(Long shopId) {
        AlumniShop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("가게를 찾을 수 없습니다"));

        return reviewRepository.findByShopOrderByCreatedAtDesc(shop)
                .stream()
                .map(this::toReviewResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteReview(Long reviewId, String userId) {
        AlumniShopReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("후기를 찾을 수 없습니다"));

        if (!review.getReviewer().getUserId().equals(userId)) {
            throw new RuntimeException("본인의 후기만 삭제할 수 있습니다");
        }

        reviewRepository.delete(review);
        log.info("가게 후기 삭제: reviewId={} by {}", reviewId, userId);
    }

    // === Helper ===

    private ShopResponse toShopResponse(AlumniShop shop) {
        Double avgRating = reviewRepository.findAverageRatingByShop(shop);
        long reviewCount = reviewRepository.countByShop(shop);

        // owner의 모든 학교 목록: "서울중(02졸)" 형태
        List<String> ownerSchools = shop.getOwner().getSchools().stream()
                .map(s -> {
                    String name = s.getSchoolName()
                            .replace("초등학교", "초").replace("중학교", "중").replace("고등학교", "고");
                    String gy = s.getGraduationYear();
                    return (gy != null && !gy.isEmpty() && gy.length() >= 4)
                            ? name + "(" + gy.substring(2) + "졸)"
                            : name;
                })
                .distinct()
                .collect(Collectors.toList());

        return ShopResponse.builder()
                .id(shop.getId())
                .ownerUserId(shop.getOwner().getUserId())
                .ownerName(shop.getOwner().getName())
                .ownerProfileImageUrl(shop.getOwner().getProfileImageUrl())
                .ownerSchools(ownerSchools)
                .shopName(shop.getShopName())
                .category(shop.getCategory())
                .subCategory(shop.getSubCategory())
                .description(shop.getDescription())
                .address(shop.getAddress())
                .detailAddress(shop.getDetailAddress())
                .phone(shop.getPhone())
                .businessHours(shop.getBusinessHours())
                .imageUrl(shop.getImageUrl())
                .averageRating(avgRating != null ? Math.round(avgRating * 10) / 10.0 : null)
                .reviewCount(reviewCount)
                .createdAt(shop.getCreatedAt().toString())
                .build();
    }

    private ShopReviewResponse toReviewResponse(AlumniShopReview review) {
        return ShopReviewResponse.builder()
                .id(review.getId())
                .reviewerUserId(review.getReviewer().getUserId())
                .reviewerName(review.getReviewer().getName())
                .reviewerProfileImageUrl(review.getReviewer().getProfileImageUrl())
                .rating(review.getRating())
                .content(review.getContent())
                .createdAt(review.getCreatedAt().toString())
                .build();
    }
}
