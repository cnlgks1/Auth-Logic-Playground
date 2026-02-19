# 🔐 Auth Logic Playground (인증 로직 플레이그라운드)

> **"JWT와 OAuth 2.0의 동작 원리를 눈으로 보며 이해하는 시각화 도구"**

이 프로젝트는 **Access Token**과 **Refresh Token**이 어떻게 발급되고, 만료 시 어떻게 **자동 갱신**되는지를 시각적으로 보여줍니다.

---

## � 테스트 방법 1: 배포된 사이트에서 바로 하기 (추천)

설치 없이 웹 브라우저만 있으면 됩니다.

**👉 [Live Demo 바로가기 (Vercel)](https://auth-logic-playground.vercel.app/)**

1. 사이트에 접속합니다.
2. **'B. 구글 계정 입장'** 섹션을 찾습니다.
3. 본인의 **구글 Client ID**와 **Secret**을 입력하고 로그인 버튼을 누릅니다.
   - 키가 없다면 아래 [🔑 구글 인증 키 발급받는 법](#-구글-인증-키-발급받는-법)을 참고하세요.

---

## � 테스트 방법 2: 내 컴퓨터(로컬)에서 실행하기

소스를 다운받아 직접 실행하는 방법입니다.

### 1. 백엔드 설정 및 실행
**로컬 환경은 SQLite를 사용하므로 별도 DB 설치가 필요 없습니다.**
(Render 배포 시에는 자동으로 PostgreSQL로 전환되도록 설정되어 있습니다)

```bash
```bash
# 1. 소스 다운로드
git clone https://github.com/YOUR_GITHUB_ID/auth-logic-playground.git
cd auth-logic-playground

# 2. 백엔드 실행 (터미널 1)
cd backend
pnpm install
pnpm db:push  # DB 초기화
pnpm start:dev

# 3. 프론트엔드 실행 (터미널 2)
cd ../frontend
pnpm install
pnpm dev
```

### 2. 접속
브라우저에서 `http://localhost:3000`으로 접속하여 테스트합니다.

---

## � 구글 인증 키 발급받는 법 (Client ID & Secret)

구글 로그인을 테스트하려면 **본인의 키**가 필요합니다. 1분이면 발급받을 수 있습니다.

1. **[Google Cloud Console](https://console.cloud.google.com/apis/credentials)**에 접속합니다.
2. **프로젝트 만들기** > **API 및 서비스** > **사용자 인증 정보**로 이동합니다.
3. **+ 사용자 인증 정보 만들기** > **OAuth 클라이언트 ID**를 클릭합니다.
4. **애플리케이션 유형**: `웹 애플리케이션` 선택.
5. **승인된 리디렉션 URI**에 다음 주소를 **반드시** 추가합니다:
   - 배포판 테스트 시: `https://auth-logic-playground.vercel.app`
   - 로컬 테스트 시: `http://localhost:3000`
6. **만들기**를 누르면 **Client ID**와 **Client Secret**이 생성됩니다.
7. 이 키를 복사하여 플레이그라운드 화면에 입력하세요.

---

## 📚 주요 기능 (참고)

- **JWT 발급**: 로그인 시 Access Token(변수)과 Refresh Token(쿠키)이 동시에 발급됩니다.
- **자동 갱신**: Access Token이 만료되면, 백그라운드에서 Refresh Token을 사용해 자동으로 로그인 상태를 연장합니다.
- **시각화**: 토큰의 남은 수명을 실시간 바(Bar) 형태로 보여주며, 만료 시점을 직접 조절할 수 있습니다.
