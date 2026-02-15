# Nexus Auth System (OauthFullStack)

**NestJS** (백엔드)와 **Next.js** (프론트엔드)로 구축된 교육용 OAuth 인증 시스템입니다.
이 프로젝트는 **Google OAuth 2.0**의 작동 원리와 **JWT(JSON Web Token)** 발급 과정을 직접 체험할 수 있도록 설계되었습니다.

## 📚 OAuth & JWT 작동 원리 (Concept Guide)

이 프로젝트의 **Playground**는 다음 두 가지 인증 흐름을 한 페이지에서 비교하며 학습할 수 있습니다:

### 1. ID/Password Login (Local Auth)
- 아이디(`admin`)와 비밀번호(`1234`)를 입력하면 서버가 검증합니다.
- 성공 시 **JWT Access Token**과 **Refresh Token (Cookie)**을 발급받습니다.

### 2. Google OAuth Login (Social Auth)
- "Google 로그인"을 클릭하여 구글 인증을 진행합니다.
- 받아온 코드를 서버로 보내면 **Backend JWT**를 발급받습니다.

### 공통: Protected API (보호된 리소스)
- 이제 프론트엔드는 **Backend Token**을 가집니다.
- 서버의 보호된 API (`/profile`)를 호출할 때, HTTP 헤더에 `Authorization: Bearer <토큰>`을 실어서 보냅니다.
- 서버는 이 토큰이 위조되지 않았는지 검증(Verify)하고 데이터를 응답합니다.

---

## 🚀 설치 및 실행 (pnpm 권장)

이 프로젝트는 패키지 매니저로 **pnpm**을 사용합니다.

### 1. 저장소 클론
```bash
git clone https://github.com/YOUR_USERNAME/oauth-system.git
cd oauth-system
```

### 2. Backend 실행
```bash
cd backend
pnpm install
```

`.env` 파일 설정:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=very_secret_key
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```
*(Playground만 사용할 경우 Client ID/Secret은 화면에서 입력해도 됩니다)*

실행:
```bash
pnpm start:dev
```

### 3. Frontend 실행
```bash
cd frontend
pnpm install
```

`.env.local` 파일 설정:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

실행:
```bash
pnpm dev
# http://localhost:3000 접속
```

## 🛠 기술 스택

- **Backend**: NestJS, Passport.js, JWT, pnpm
- **Frontend**: Next.js 14, Tailwind CSS, Lucide React, pnpm
- **Deployment**: Ready via Docker / Vercel / Render

## 📜 라이선스

MIT License
