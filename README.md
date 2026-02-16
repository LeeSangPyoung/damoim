# 우리반 - 동창 찾기 서비스

학창시절 친구들과 다시 연결되는 따뜻한 공간

## 프로젝트 구조

```
lsp_project/
├── ourclass-backend/          # Spring Boot 백엔드
│   ├── src/
│   ├── pom.xml
│   └── README.md
├── damoim-ui-prototype/       # React 프론트엔드
│   ├── src/
│   ├── package.json
│   └── README.md
└── README.md                  # 이 파일
```

## 실행 방법

### 1. PostgreSQL 실행

```bash
docker ps | grep postgres
# 실행 중이 아니면
docker start ourclass-postgres
```

### 2. 백엔드 실행

**방법 1: IntelliJ IDEA 사용 (권장)**
1. IntelliJ IDEA에서 `ourclass-backend` 폴더 열기
2. Maven 프로젝트로 Import
3. `OurclassBackendApplication.java` 실행

**방법 2: 터미널에서 실행**
```bash
cd ourclass-backend
./mvnw spring-boot:run
```

서버: http://localhost:8080

### 3. 프론트엔드 실행

```bash
cd damoim-ui-prototype
npm install  # 처음 한 번만
npm run dev
```

프론트엔드: http://localhost:5173

## 기능

### ✅ 완료된 기능

1. **회원가입**
   - 여러 학교 정보 입력 (초/중/고/대)
   - 학교 유형, 학교명, 졸업년도, 학년, 반 입력
   - JWT 토큰 자동 발급

2. **로그인**
   - 아이디/비밀번호 인증
   - JWT 토큰 기반 인증
   - 자동 로그인 유지

3. **대시보드**
   - 로그인한 사용자 정보 표시
   - 로그아웃 기능

## 기술 스택

### 백엔드
- Java 21
- Spring Boot 3.2.2
- Spring Security + JWT
- Spring Data JPA
- PostgreSQL 16
- Maven

### 프론트엔드
- React 18 + TypeScript
- React Router v6
- Axios
- CSS3

## 개발자

- 이상평 (Lee Sang Pyoung)
- 2026년 2월
