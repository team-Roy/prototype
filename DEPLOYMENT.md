# 팬덤 라운지 배포 가이드

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [사전 요구사항](#사전-요구사항)
3. [데이터베이스 설정 (Neon)](#데이터베이스-설정-neon)
4. [Redis 설정 (Upstash)](#redis-설정-upstash)
5. [스토리지 설정 (Cloudflare R2)](#스토리지-설정-cloudflare-r2)
6. [백엔드 배포 (Railway)](#백엔드-배포-railway)
7. [프론트엔드 배포 (Vercel)](#프론트엔드-배포-vercel)
8. [환경 변수](#환경-변수)
9. [배포 체크리스트](#배포-체크리스트)
10. [문제 해결](#문제-해결)

---

## 아키텍처 개요

```
┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Railway       │
│   (Frontend)    │────▶│   (Backend)     │
│   Next.js       │     │   NestJS        │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │  Neon    │ │ Upstash  │ │   R2     │
             │ Postgres │ │  Redis   │ │ Storage  │
             └──────────┘ └──────────┘ └──────────┘
```

---

## 사전 요구사항

- [Neon](https://neon.tech) 계정
- [Upstash](https://upstash.com) 계정
- [Cloudflare](https://cloudflare.com) 계정 (R2 사용)
- [Railway](https://railway.app) 계정
- [Vercel](https://vercel.com) 계정
- GitHub 저장소

---

## 데이터베이스 설정 (Neon)

### 1. 프로젝트 생성

1. [Neon Console](https://console.neon.tech)에서 새 프로젝트 생성
2. Region: `Asia Pacific (Singapore)` 또는 가장 가까운 리전 선택
3. PostgreSQL 버전: `15` 이상

### 2. 연결 문자열 설정

Neon에서 두 가지 연결 문자열 제공:

```bash
# Direct connection (마이그레이션용)
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Pooled connection (애플리케이션용, 권장)
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
```

> **중요**: 프로덕션에서는 Connection Pooling URL을 사용하세요.

### 3. Connection Pooling 설정

Neon 콘솔에서:

1. `Settings` → `Connection pooling`
2. `Pool mode`: `Transaction` (권장)
3. `Pool size`: 기본값 사용 또는 필요에 따라 조정

### 4. 데이터베이스 마이그레이션

```bash
# 로컬에서 마이그레이션 실행 (Direct URL 사용)
cd apps/api
DATABASE_URL="postgresql://...direct-url..." npx prisma migrate deploy
```

Railway에서 자동 마이그레이션:

```bash
# Railway 환경 변수에 DATABASE_URL 설정 후
npx prisma migrate deploy
```

---

## Redis 설정 (Upstash)

### 1. 데이터베이스 생성

1. [Upstash Console](https://console.upstash.com)에서 새 Redis 데이터베이스 생성
2. Region: `Asia Pacific (Singapore)` 또는 가장 가까운 리전 선택
3. `TLS` 활성화 (보안)

### 2. 연결 정보

```bash
REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"

# 또는 개별 설정
REDIS_HOST="xxx.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="xxx"
```

### 3. 설정 권장사항

- `Eviction`: `noeviction` (기본값)
- `Max connections`: 필요에 따라 조정
- `Data persistence`: 활성화 (세션 데이터 보존)

---

## 스토리지 설정 (Cloudflare R2)

### 1. R2 버킷 생성

1. Cloudflare Dashboard → `R2` → `Create bucket`
2. 버킷 이름: `fandom-lounge-media` (또는 원하는 이름)
3. Location: `APAC` (권장)

### 2. API 토큰 생성

1. `R2` → `Manage R2 API Tokens` → `Create API Token`
2. Permissions: `Object Read & Write`
3. 특정 버킷만 허용 설정

### 3. 퍼블릭 액세스 설정

1. 버킷 선택 → `Settings` → `Public access`
2. `Allow Access` 활성화
3. Custom domain 설정 (선택사항):
   - `media.yourdomain.com` → 버킷 연결

### 4. CORS 설정

버킷 → `Settings` → `CORS policy`:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 5. 환경 변수

```bash
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="fandom-lounge-media"
R2_PUBLIC_URL="https://pub-xxx.r2.dev" # 또는 커스텀 도메인
```

---

## 백엔드 배포 (Railway)

### 1. 프로젝트 생성

1. [Railway Dashboard](https://railway.app)에서 `New Project`
2. `Deploy from GitHub repo` 선택
3. 저장소 연결

### 2. 서비스 설정

`Settings` → `Service`:

```yaml
# Root Directory
apps/api

# Build Command
pnpm install && npx prisma generate && pnpm build

# Start Command
npx prisma migrate deploy && node dist/main.js

# Watch Paths
apps/api/**
packages/shared/**
```

### 3. 환경 변수 설정

Railway Dashboard → `Variables`:

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=rediss://...

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=fandom-lounge-media
R2_PUBLIC_URL=https://...

# OAuth (선택)
KAKAO_CLIENT_ID=xxx
KAKAO_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# App
NODE_ENV=production
PORT=4000
CORS_ORIGINS=https://yourdomain.com
```

### 4. 헬스체크 설정

Railway가 자동으로 `/health` 엔드포인트 체크

### 5. 도메인 설정

`Settings` → `Networking` → `Generate Domain` 또는 커스텀 도메인 연결

---

## 프론트엔드 배포 (Vercel)

### 1. 프로젝트 임포트

1. [Vercel Dashboard](https://vercel.com)에서 `Add New` → `Project`
2. GitHub 저장소 임포트
3. Framework Preset: `Next.js`

### 2. 빌드 설정

```yaml
# Root Directory
apps/web

# Build Command (자동 감지)
pnpm build

# Output Directory (자동)
.next
```

### 3. 환경 변수

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. 도메인 설정

`Settings` → `Domains` → 커스텀 도메인 추가

---

## 환경 변수

### Backend (apps/api/.env)

| 변수명                   | 설명                    | 필수 | 예시                     |
| ------------------------ | ----------------------- | ---- | ------------------------ |
| `DATABASE_URL`           | PostgreSQL 연결 문자열  | ✅   | `postgresql://...`       |
| `REDIS_URL`              | Redis 연결 문자열       | ✅   | `rediss://...`           |
| `JWT_SECRET`             | JWT 서명 키 (32자 이상) | ✅   | `your-secret-key`        |
| `JWT_EXPIRES_IN`         | Access Token 만료시간   | ✅   | `15m`                    |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 만료시간  | ✅   | `7d`                     |
| `R2_ACCOUNT_ID`          | Cloudflare 계정 ID      | ✅   | `xxx`                    |
| `R2_ACCESS_KEY_ID`       | R2 Access Key           | ✅   | `xxx`                    |
| `R2_SECRET_ACCESS_KEY`   | R2 Secret Key           | ✅   | `xxx`                    |
| `R2_BUCKET_NAME`         | R2 버킷 이름            | ✅   | `fandom-lounge-media`    |
| `R2_PUBLIC_URL`          | R2 퍼블릭 URL           | ✅   | `https://pub-xxx.r2.dev` |
| `NODE_ENV`               | 환경                    | ✅   | `production`             |
| `PORT`                   | 서버 포트               | ❌   | `4000`                   |
| `CORS_ORIGINS`           | 허용 도메인             | ✅   | `https://yourdomain.com` |
| `KAKAO_CLIENT_ID`        | 카카오 OAuth            | ❌   | `xxx`                    |
| `KAKAO_CLIENT_SECRET`    | 카카오 OAuth            | ❌   | `xxx`                    |
| `GOOGLE_CLIENT_ID`       | 구글 OAuth              | ❌   | `xxx`                    |
| `GOOGLE_CLIENT_SECRET`   | 구글 OAuth              | ❌   | `xxx`                    |

### Frontend (apps/web/.env)

| 변수명                | 설명           | 필수 | 예시                         |
| --------------------- | -------------- | ---- | ---------------------------- |
| `NEXT_PUBLIC_API_URL` | 백엔드 API URL | ✅   | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | 프론트엔드 URL | ✅   | `https://yourdomain.com`     |

---

## 배포 체크리스트

### 배포 전

- [ ] 모든 환경 변수 설정 완료
- [ ] `pnpm lint` 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 성공
- [ ] 데이터베이스 마이그레이션 준비

### 데이터베이스

- [ ] Neon 프로젝트 생성
- [ ] Connection pooling 활성화
- [ ] DATABASE_URL 설정
- [ ] `prisma migrate deploy` 실행

### 캐싱

- [ ] Upstash Redis 생성
- [ ] REDIS_URL 설정
- [ ] TLS 활성화 확인

### 스토리지

- [ ] R2 버킷 생성
- [ ] API 토큰 생성
- [ ] CORS 설정
- [ ] 퍼블릭 액세스 활성화

### 백엔드

- [ ] Railway 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 배포 성공
- [ ] 헬스체크 통과 (`/health`)
- [ ] 도메인 설정

### 프론트엔드

- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 배포 성공
- [ ] 도메인 설정
- [ ] API 연결 확인

### 배포 후

- [ ] 로그인/회원가입 테스트
- [ ] 라운지 생성 테스트
- [ ] 게시물 작성 테스트
- [ ] 이미지 업로드 테스트
- [ ] 알림 기능 테스트

---

## 문제 해결

### 데이터베이스 연결 오류

```
Error: Can't reach database server
```

- Connection pooling URL 사용 확인
- `?sslmode=require` 파라미터 확인
- IP 화이트리스트 확인 (Neon은 기본적으로 모든 IP 허용)

### Redis 연결 오류

```
Error: Redis connection refused
```

- `rediss://` 프로토콜 사용 (TLS)
- Upstash 대시보드에서 연결 정보 재확인

### R2 업로드 오류

```
Error: Access Denied
```

- API 토큰 권한 확인 (`Object Read & Write`)
- 버킷 이름 확인
- CORS 설정 확인

### CORS 오류

```
Error: CORS policy blocked
```

- `CORS_ORIGINS`에 프론트엔드 도메인 추가
- 프로토콜 포함 (`https://`)

### 빌드 오류

```
Error: Cannot find module '@fandom/shared'
```

- monorepo 설정 확인
- `pnpm-workspace.yaml` 확인
- 의존성 재설치: `pnpm install --frozen-lockfile`

---

## 유용한 명령어

```bash
# 로컬 개발
pnpm dev

# 빌드 테스트
pnpm build

# 타입 체크
pnpm typecheck

# 린트
pnpm lint

# Prisma 마이그레이션 생성
pnpm --filter api exec prisma migrate dev

# Prisma 마이그레이션 배포
pnpm --filter api exec prisma migrate deploy

# Prisma Studio (DB GUI)
pnpm --filter api exec prisma studio

# Docker 빌드 테스트
docker build -f apps/api/Dockerfile -t fandom-lounge-api .
```
