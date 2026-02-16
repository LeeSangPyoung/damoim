package com.ourclass.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/users/**").permitAll()  // 임시로 프로필 API 허용
                        .requestMatchers("/api/messages/**").permitAll()  // 임시로 쪽지 API 허용
                        .requestMatchers("/api/posts/**").permitAll()  // 임시로 게시판 API 허용
                        .requestMatchers("/api/guestbook/**").permitAll()  // 임시로 방명록 API 허용
                        .requestMatchers("/api/chat/**").permitAll()  // 임시로 채팅 API 허용
                        .requestMatchers("/api/friends/**").permitAll()  // 임시로 친구 API 허용
                        .requestMatchers("/api/group-chat/**").permitAll()  // 임시로 그룹채팅 API 허용
                        .requestMatchers("/api/notifications/**").permitAll()  // 임시로 알림 API 허용
                        .requestMatchers("/api/schools/**").permitAll()  // 학교 검색 API 허용
                        .requestMatchers("/ws/**").permitAll()  // WebSocket 허용
                        .requestMatchers("/uploads/**").permitAll()  // 업로드된 이미지 접근 허용
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:5173"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
