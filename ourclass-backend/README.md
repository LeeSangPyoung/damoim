# 우리반 백엔드

Spring Boot + PostgreSQL 기반 동창 찾기 서비스 백엔드

## 기술 스택

- Java 21
- Spring Boot 3.2.2
- Spring Security + JWT
- Spring Data JPA
- PostgreSQL 16
- Maven

## 실행 방법

### 1. PostgreSQL 실행 확인

Docker에서 PostgreSQL이 실행 중인지 확인:
```bash
docker ps | grep postgres
```

실행 중이 아니면:
```bash
docker start ourclass-postgres
```

### 2. IntelliJ IDEA에서 실행

1. IntelliJ IDEA 실행
2. `Open` → `/Users/leesangpyoung/lsp_project/ourclass-backend` 선택
3. Maven 프로젝트로 Import
4. `OurclassBackendApplication.java` 우클릭 → `Run`

또는 터미널에서:
```bash
cd /Users/leesangpyoung/lsp_project/ourclass-backend
./mvnw spring-boot:run
```

### 3. 서버 확인

서버가 `http://localhost:8080`에서 실행됩니다.

## API 엔드포인트

### 회원가입
- **POST** `/api/auth/signup`
- Body:
```json
{
  "userId": "testuser",
  "password": "password123",
  "name": "홍길동",
  "email": "test@example.com",
  "schools": [
    {
      "schoolType": "고등학교",
      "schoolName": "서울고등학교",
      "graduationYear": "2010",
      "grade": "3",
      "classNumber": "5"
    }
  ]
}
```

### 로그인
- **POST** `/api/auth/login`
- Body:
```json
{
  "userId": "testuser",
  "password": "password123"
}
```

## 데이터베이스 설정

```yaml
Database: ourclass
Host: localhost
Port: 5432
Username: postgres
Password: postgres
```

## JWT 설정

- Secret Key: `ourclass-jwt-secret-key-for-development-please-change-in-production-environment`
- Expiration: 24시간
