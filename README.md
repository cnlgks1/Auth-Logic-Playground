# 🔐 Auth Logic Playground (OAuth FullStack)

> **"JWT와 OAuth 2.0의 동작 원리를 눈으로 보며 이해하는 시각화 도구"**

**[Live Demo 바로가기 (Vercel)](https://auth-logic-playground.vercel.app/)**  
*(배포된 사이트에서 직접 구글 로그인을 테스트해보세요!)*

![Project Screenshot](https://via.placeholder.com/1200x600/0f1014/a855f7?text=Auth+Logic+Playground+Dashboard)

---

## 📝 프로젝트 소개 (Introduction)

인증(Authentication) 로직은 개발자가 가장 먼저 마주하는 장벽 중 하나입니다.  
이 프로젝트는 **NestJS(백엔드)**와 **Next.js(프론트엔드)**를 사용하여, **ID/PW 로그인(Local Auth)**과 **Google OAuth 2.0(Social Auth)**의 차이점을 직관적인 **Cyberpunk Dashboard UI**로 시각화하여 보여줍니다.

개발자는 이 도구를 통해 다음을 학습할 수 있습니다:
- **JWT 발급 과정**: Access Token과 Refresh Token이 어떻게 생성되고 쿠키/헤더에 담기는지.
- **OAuth 흐름**: `Authorization Code`가 어떻게 서버로 전달되고 토큰으로 교환되는지.
- **토큰 만료 및 갱신**: Access Token 만료 시, Refresh Token을 사용해 자동으로(Silent Refresh) 갱신되는 로직.
- **보안**: `HttpOnly Cookie`, `CORS`, `Environment Variables` 관리 등.

---

## ✨ 주요 기능 (Features)

### 1. 🔍 인증 흐름 비교 (Auth Flow Comparison)
- **Local Login (일반 로그인)**:
  - `admin` / `1234` 계정으로 로그인.
  - 서버에서 검증 후 Access Token(반환) + Refresh Token(쿠키) 발급.
- **Google OAuth (소셜 로그인)**:
  - 구글 로그인 창으로 리디렉션 -> 코드 수신 -> 백엔드 교환 -> 자체 JWT 발급.
  - **Custom Credentials Mode**: 사용자가 자신의 Google Client ID/Secret을 직접 입력하여 테스트 가능.

### 2. ⚡️ 실시간 로그 & 시각화 (Real-time Visualization)
- 모든 인증 단계(요청, 응답, 에러, 헤더 포함)를 **터미널 스타일의 로그**로 실시간 출력.
- Access Token의 남은 수명을 **카운트다운**으로 표시.
- 토큰 만료 시 자동 로그아웃 또는 갱신 시각화.

### 3. 🎨 State-of-the-Art UI/UX
- **Cyberpunk / SaaS Aesthetic**: 다크 모드, 네온 글래스모피즘(Glassmorphism) 디자인.
- **Responsive Design**: 모바일, 태블릿, 데스크탑 완벽 지원.
- **Interactive Elements**: 사용자가 직접 토큰 수명을 조절하여 만료 테스트 가능.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **State**: React Hooks (Context-less architecture for simplicity)
- **Deployment**: Vercel

### Backend
- **Framework**: NestJS (Modular Architecture)
- **Auth**: Passport.js (Strategy Pattern), JWT
- **Database**: PostgreSQL, Prisma ORM
- **Deployment**: Render (Blueprint / Docker)

---

## 🚀 로컬 실행 방법 (Getting Started)

### 1. 저장소 클론 (Clone)
```bash
git clone https://github.com/YOUR_USERNAME/Auth-Logic-Playground.git
cd Auth-Logic-Playground
```

### 2. 백엔드 설정 (Backend)
```bash
cd backend
pnpm install

# .env 파일 생성
echo "DATABASE_URL='postgresql://user:pass@localhost:5432/oauth_db'" > .env
echo "JWT_SECRET='dev_secret'" >> .env
echo "GOOGLE_CLIENT_ID='your_client_id'" >> .env
echo "GOOGLE_CLIENT_SECRET='your_secret'" >> .env
echo "FRONTEND_URL='http://localhost:3000'" >> .env

# DB 스키마 동기화 (로컬 DB 필요 시)
npx prisma db push

# 실행
pnpm start:dev
```

### 3. 프론트엔드 설정 (Frontend)
```bash
cd ../frontend
pnpm install

# .env.local 파일 생성
echo "NEXT_PUBLIC_BACKEND_URL='http://localhost:3001'" > .env.local
# (선택) 기본 Client ID 설정
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID='your_client_id'" >> .env.local

# 실행
pnpm dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요!

---

## 📂 프로젝트 구조 (Structure)

```
.
├── backend/            # NestJS Server
│   ├── src/auth/       # Auth Module (Controller, Service, Strategies)
│   ├── prisma/         # Database Schema
│   └── ...
├── frontend/           # Next.js Client
│   ├── app/page.tsx    # Main Dashboard UI
│   ├── lib/api.ts      # API Wrapper (Interceptor)
│   └── ...
└── render.yaml         # Render Deployment Blueprint
```

## 📜 라이선스 (License)

MIT License @ 2024 Auth Logic Playground
