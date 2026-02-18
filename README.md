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

## 🔑 JWT 인증 원리 및 기능 (Core Concept)

이 프로젝트는 **Access Token**과 **Refresh Token**의 생명주기를 시각적으로 보여줍니다.

### 1. 토큰 발급 및 저장 (Token Issuance & Storage)
로그인 성공 시 서버는 두 가지 토큰을 발급합니다:

| 토큰 종류 | 수명 (Default) | 저장 위치 | 용도 및 특징 |
| --- | --- | --- | --- |
| **Access Token (AT)** | 15분 (짧음) | **JS 변수 (Memory)** | API 요청 시 `Authorization` 헤더에 담아 사용. <br> XSS 공격에 상대적으로 안전하지만, 새로고침 시 사라짐. |
| **Refresh Token (RT)** | 7일 (김) | **HttpOnly Cookie** | AT가 만료되었을 때 재발급 용도. <br> 자바스크립트로 접근 불가능하여 XSS로부터 안전. |

### 2. Silent Refresh (조용한 갱신)
사용자가 서비스를 이용하는 도중 Access Token이 만료되면 어떻게 될까요?
1. 클라이언트가 API를 요청합니다.
2. 서버는 **401 Unauthorized** (토큰 만료) 에러를 보냅니다.
3. 클라이언트(API Interceptor)는 이를 감지하고, **자동으로 `/auth/refresh` 요청**을 보냅니다. (이때 쿠키에 있는 RT가 전송됨)
4. 서버 검증 후 **새로운 AT**를 발급해줍니다.
5. 클라이언트는 새 토큰으로 **원래 하려던 요청을 재시도**합니다.
*👉 사용자는 로그아웃되지 않고 끊김 없이 서비스를 이용할 수 있습니다.*

### 3. Auto Refresh (자동 갱신)
이 플레이그라운드만의 기능으로, 토큰이 만료되기 2초 전에 **미리 갱신**하는 옵션입니다.
* **On**: 만료 직전 백그라운드에서 새 토큰을 받아와 로그인 상태를 무한히 연장합니다.
* **Off**: 토큰이 만료되도록 내버려 둡니다. 이후 데이터 조회 시 **Silent Refresh**가 발생하는 것을 테스트할 수 있습니다.

---

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
