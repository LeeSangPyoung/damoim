package com.ourclass.backend.repository;

import com.ourclass.backend.entity.AlumniShop;
import com.ourclass.backend.entity.AlumniShopReview;
import com.ourclass.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AlumniShopReviewRepository extends JpaRepository<AlumniShopReview, Long> {

    List<AlumniShopReview> findByShopOrderByCreatedAtDesc(AlumniShop shop);

    boolean existsByShopIdAndReviewerId(Long shopId, Long reviewerId);

    @Query("SELECT AVG(r.rating) FROM AlumniShopReview r WHERE r.shop = :shop")
    Double findAverageRatingByShop(@Param("shop") AlumniShop shop);

    long countByShop(AlumniShop shop);
}
