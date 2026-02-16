package com.ourclass.backend;

import jakarta.persistence.EntityManager;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootApplication
@EnableScheduling
public class OurclassBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(OurclassBackendApplication.class, args);
	}

	// 기존 게시글에 학교 정보가 없는 경우 작성자의 첫 번째 학교로 마이그레이션
	@Bean
	CommandLineRunner migratePostSchoolInfo(EntityManager entityManager, TransactionTemplate transactionTemplate) {
		return args -> transactionTemplate.executeWithoutResult(status -> {
			int updated = entityManager.createNativeQuery(
				"UPDATE posts p SET school_name = " +
				"(SELECT us.school_name FROM user_schools us WHERE us.user_id = p.author_id ORDER BY us.id LIMIT 1), " +
				"graduation_year = " +
				"(SELECT us.graduation_year FROM user_schools us WHERE us.user_id = p.author_id ORDER BY us.id LIMIT 1) " +
				"WHERE p.school_name IS NULL"
			).executeUpdate();
			if (updated > 0) {
				System.out.println("Migrated " + updated + " posts with school info.");
			}
		});
	}
}
