package com.ourclass.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Component
public class DatabaseMigration implements CommandLineRunner {

    private final DataSource dataSource;

    public DatabaseMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // chat_messages 테이블에 첨부파일 관련 컬럼 추가
            stmt.execute("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type varchar(20) DEFAULT 'TEXT'");
            stmt.execute("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_url varchar(500)");
            stmt.execute("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name varchar(255)");
            stmt.execute("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_size bigint");

            // group_chat_messages 테이블에 첨부파일 관련 컬럼 추가
            stmt.execute("ALTER TABLE group_chat_messages ADD COLUMN IF NOT EXISTS attachment_url varchar(500)");
            stmt.execute("ALTER TABLE group_chat_messages ADD COLUMN IF NOT EXISTS file_name varchar(255)");
            stmt.execute("ALTER TABLE group_chat_messages ADD COLUMN IF NOT EXISTS file_size bigint");

            System.out.println("[Migration] chat_messages, group_chat_messages 컬럼 추가 완료");
        } catch (Exception e) {
            System.err.println("[Migration] 컬럼 추가 실패 (이미 존재할 수 있음): " + e.getMessage());
        }
    }
}
