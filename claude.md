# Fandom Lounge - 작업 현황

## 완료된 작업

### 1. AWS Amplify 프론트엔드 배포

- Vercel에서 AWS Amplify로 마이그레이션 완료
- Next.js SSR (standalone) 빌드 설정
- `amplify.yml` 설정 완료
- 배포 URL: https://main.d23ygzlfve6ri5.amplifyapp.com/

### 2. 커스텀 도메인 설정

- Cloudflare DNS로 마이그레이션 (가비아에서 네임서버 변경)
- 네임서버: `angelina.ns.cloudflare.com`, `hasslo.ns.cloudflare.com`
- CNAME Flattening으로 루트 도메인 지원
- **www.fandom-lounge.com** - 작동 확인
- **fandom-lounge.com** - DNS 전파 완료 (일부 ISP 캐시 대기중)
- **api.fandom-lounge.com** - EC2 백엔드 연결

### 3. Cloudflare DNS 레코드

| Type  | Name              | Content                       |
| ----- | ----------------- | ----------------------------- |
| A     | api               | 43.200.179.28                 |
| CNAME | fandom-lounge.com | d1fufsigd5odkg.cloudfront.net |
| CNAME | www               | d1fufsigd5odkg.cloudfront.net |

### 4. CORS 설정 업데이트

- 백엔드 CORS에 Amplify 도메인 추가 완료

### 5. 이메일 서비스 설정

- AWS SES 프로덕션 요청 거절됨 (새 계정 신뢰도 문제)
- **Resend**로 이메일 서비스 변경
- Resend API Key 설정 완료
- 도메인 인증 완료 (Cloudflare 자동 연동)

---

## 진행 중인 작업

### 이메일 기능 테스트

- Resend 백엔드 연동 완료
- 이메일 인증 기능 테스트 필요
- 비밀번호 찾기 기능 테스트 필요

---

## 다음 할 일

1. [ ] 이메일 인증 기능 테스트
2. [ ] 비밀번호 찾기 기능 테스트
3. [ ] DNS 전파 완료 확인 (fandom-lounge.com)

---

## 인프라 구성

```
Frontend: AWS Amplify (Next.js SSR)
Backend: AWS EC2 (NestJS)
Database: AWS RDS (PostgreSQL)
Email: Resend (월 3,000통 무료)
DNS: Cloudflare
Domain: fandom-lounge.com (가비아에서 구매)
```

---

## EC2 서버 접속 매뉴얼

### SSH 접속

```bash
ssh -i /Users/johnn/Downloads/fandom-lounge-key.pem ec2-user@43.200.179.28
```

### 주요 경로

- 앱 디렉토리: `/home/ec2-user/app`
- 환경 변수: `/home/ec2-user/app/.env`
- PM2 로그: `pm2 logs`

### 자주 사용하는 명령어

```bash
# 서버 상태 확인
pm2 status

# 서버 재시작
pm2 restart all

# 로그 확인
pm2 logs --lines 50

# 환경 변수 편집
nano /home/ec2-user/app/.env
```

### API 배포 방법

```bash
# 로컬에서
cd "/Users/johnn/Desktop/2025/Dev/fandom lounge"
pnpm --filter @fandom/shared build
pnpm --filter @fandom/api build

# 배포 파일 생성
cd apps/api && tar -czf /tmp/api-deploy.tar.gz dist package.json prisma
cd ../../packages/shared && tar -czf /tmp/shared-deploy.tar.gz dist package.json

# EC2로 전송
scp -i /Users/johnn/Downloads/fandom-lounge-key.pem /tmp/api-deploy.tar.gz ec2-user@43.200.179.28:/home/ec2-user/
scp -i /Users/johnn/Downloads/fandom-lounge-key.pem /tmp/shared-deploy.tar.gz ec2-user@43.200.179.28:/home/ec2-user/

# EC2에서
ssh -i /Users/johnn/Downloads/fandom-lounge-key.pem ec2-user@43.200.179.28
cd /home/ec2-user/app && tar -xzf /home/ec2-user/api-deploy.tar.gz
cd /home/ec2-user/app/node_modules/@fandom/shared && tar -xzf /home/ec2-user/shared-deploy.tar.gz
pm2 restart all
```

---

## RDS 데이터베이스 접속 매뉴얼

### 접속 정보

- 호스트: `fandom-lounge-db.cfweqkg4axxx.ap-northeast-2.rds.amazonaws.com`
- 포트: `5432`
- 데이터베이스: `postgres`
- 유저: `postgres`
- 비밀번호: `DoSgqeWNQGL4nLHY8R28`

### psql 접속 (로컬에서)

```bash
PGPASSWORD="DoSgqeWNQGL4nLHY8R28" psql -h fandom-lounge-db.cfweqkg4axxx.ap-northeast-2.rds.amazonaws.com -U postgres -d postgres
```

### DATABASE_URL (Prisma용)

```
postgresql://postgres:DoSgqeWNQGL4nLHY8R28@fandom-lounge-db.cfweqkg4axxx.ap-northeast-2.rds.amazonaws.com:5432/postgres?sslmode=require
```

---

## 주요 파일

- `amplify.yml` - Amplify 빌드 설정
- `apps/web/` - Next.js 프론트엔드
- `apps/api/` - NestJS 백엔드
- `apps/api/src/email/email.service.ts` - Resend 이메일 서비스

---

## 환경 변수 (EC2 .env)

```env
# App
NODE_ENV=production
PORT=3001
APP_URL=https://fandom-lounge.com

# Database
DATABASE_URL=postgresql://postgres:DoSgqeWNQGL4nLHY8R28@fandom-lounge-db.cfweqkg4axxx.ap-northeast-2.rds.amazonaws.com:5432/postgres?sslmode=require

# JWT
JWT_SECRET=fandom-lounge-jwt-secret-prod-2024
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=fandom-lounge-refresh-secret-prod-2024
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://fandom-lounge.com,https://www.fandom-lounge.com,https://main.d23ygzlfve6ri5.amplifyapp.com,http://localhost:3000

# Resend Email
RESEND_API_KEY=re_UReRv6XJ_5owbfqdtgRc2kcGv3f9j1JD8
EMAIL_FROM=noreply@fandom-lounge.com
```

---

## 트러블슈팅 기록

### Amplify 빌드 이슈 해결

1. pnpm symlink 문제 → npm install로 대체
2. 220MB 사이즈 제한 → 최소 의존성만 설치 (next, react, react-dom)
3. workspace: 프로토콜 오류 → 별도 package.json 생성

### 도메인 설정 이슈 해결

1. 가비아 루트 도메인 CNAME 불가 → Cloudflare CNAME Flattening 사용
2. CloudFront alias 충돌 → 기존 Vercel 배포 제거
3. DNS 전파 지연 → ISP 캐시 문제, 시간이 지나면 해결

### 이메일 서비스 이슈 해결

1. AWS SES 프로덕션 요청 거절 → Resend로 대체
2. EC2 배포 시 workspace 프로토콜 오류 → package.json에서 제거
