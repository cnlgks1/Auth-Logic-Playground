import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req, @Res({ passthrough: true }) res, @Body() body: { expiresInSeconds?: number; refreshTokenExpiresInSeconds?: number }) {
    const expiresInSeconds = body.expiresInSeconds;
    const refreshTokenExpiresInSeconds = body.refreshTokenExpiresInSeconds;

    const { access_token, refresh_token, user, expiresIn } = await this.authService.login(req.user, expiresInSeconds, refreshTokenExpiresInSeconds);

    const isProduction = process.env.NODE_ENV === 'production';

    // 입력값 또는 기본값(7일)을 기반으로 maxAge 계산
    const maxAge = refreshTokenExpiresInSeconds ? refreshTokenExpiresInSeconds * 1000 : 7 * 24 * 60 * 60 * 1000;

    console.log(`🍪 [Backend] 쿠키 설정: secure=${isProduction}, maxAge=${maxAge}, sameSite=${isProduction ? 'none' : 'lax'}`);

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProduction,               // 배포 환경: true, 로컬: false
      sameSite: isProduction ? 'none' : 'lax', // 배포 환경: 'none', 로컬: 'lax'
      maxAge: maxAge,
    });

    return { access_token, user, expiresIn };
  }

  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res, @Body() body: { expiresInSeconds?: number }) {
    console.log('🔄 [Backend] 리프레시 요청 수신됨');
    console.log('🍪 [Backend] 쿠키:', req.cookies);

    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      console.error('❌ [Backend] refresh_token 쿠키를 찾을 수 없습니다!');
      return res.status(401).json({ message: '리프레시 토큰이 없습니다.' });
    }

    try {
      const result = await this.authService.refresh(refreshToken, body.expiresInSeconds);
      console.log('✅ [Backend] 리프레시 성공');
      return result;
    } catch (e) {
      console.error('❌ [Backend] 리프레시 토큰 검증 실패:', e.message);
      // 리프레시 실패 시 쿠키 삭제
      res.clearCookie('refresh_token');
      return res.status(401).json({ message: '유효하지 않은 리프레시 토큰입니다.' });
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // 구글로 자동 리다이렉트
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // 전통적인 리다이렉트 방식. state 파라미터 없이는 'isTestMode'를 전달하기 어렵습니다.
    // 플레이그라운드 데모에서는 수동 /exchange 엔드포인트를 사용하므로, 이 부분은 간단히 유지하거나 기본값을 사용합니다.
    const { access_token } = await this.authService.login(req.user); // 기본 모드
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?token=${access_token}&login_success=true`);
  }

  @Post('exchange') // 플레이그라운드용 수동 교환
  async exchangeToken(@Body() body: { code: string; clientId: string; clientSecret: string; redirectUri: string; expiresInSeconds?: number; refreshTokenExpiresInSeconds?: number }, @Res({ passthrough: true }) res) {
    const { code, redirectUri, expiresInSeconds, refreshTokenExpiresInSeconds } = body;
    // 1. Client ID/Secret 결정 (사용자 입력값 우선, 없으면 환경변수)
    // 참고: 프론트엔드에서 입력을 강제하더라도, 백엔드는 안전장치로 환경변수를 fallback으로 가지고 있을 수 있습니다.
    const clientId = body.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = body.clientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (body.clientId) {
      console.log(`🔧 [Backend] 사용자 입력 Client ID 사용: ${body.clientId.substring(0, 15)}...`);
    } else if (process.env.GOOGLE_CLIENT_ID) {
      console.log(`🔧 [Backend] 서버 환경변수(.env) Client ID 사용`);
    }

    if (!clientId || !clientSecret) {
      console.error('❌ [Backend] 구글 자격증명(Client ID/Secret)이 없습니다.');
      throw new Error('Backend: Google Client ID/Secret이 설정되지 않았습니다. Body로 보내거나 .env를 확인하세요.');
    }

    // 2. 구글 토큰 교환 요청
    const result = await this.authService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri, expiresInSeconds, refreshTokenExpiresInSeconds);

    // 구글 로그인 시에도 리프레시 토큰 쿠키 설정!
    if (result.backend?.refresh_token) {
      const isProduction = process.env.NODE_ENV === 'production';
      const maxAge = refreshTokenExpiresInSeconds ? refreshTokenExpiresInSeconds * 1000 : 7 * 24 * 60 * 60 * 1000;

      res.cookie('refresh_token', result.backend.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: maxAge,
      });
    }

    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req) {
    return req.user;
  }
}
