import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req, @Res({ passthrough: true }) res, @Body() body: { expiresInSeconds?: number; refreshTokenExpiresInSeconds?: number }) {
    const expiresInSeconds = body.expiresInSeconds;
    const refreshTokenExpiresInSeconds = body.refreshTokenExpiresInSeconds;
    
    const { access_token, refresh_token, user, expiresIn } = await this.authService.login(req.user, expiresInSeconds, refreshTokenExpiresInSeconds);

    // FORCE RELAXED SETTINGS FOR DEBUGGING
    const isProduction = false; 
    
    // Calculate maxAge based on input or default (7d)
    const maxAge = refreshTokenExpiresInSeconds ? refreshTokenExpiresInSeconds * 1000 : 7 * 24 * 60 * 60 * 1000;

    console.log(`🍪 [Backend] Setting Cookie: secure=false, maxAge=${maxAge}, sameSite=lax`);

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: false, // Force false for localhost
      sameSite: 'lax', // Force lax for localhost
      maxAge: maxAge, 
    });

    return { access_token, user, expiresIn };
  }

  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res, @Body() body: { expiresInSeconds?: number }) {
    console.log('🔄 [Backend] Refresh Request Received');
    console.log('🍪 [Backend] Cookies:', req.cookies);
    
    const refreshToken = req.cookies['refresh_token'];
    
    if (!refreshToken) {
      console.error('❌ [Backend] No refresh_token cookie found!');
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    try {
      const result = await this.authService.refresh(refreshToken, body.expiresInSeconds);
      console.log('✅ [Backend] Refresh Successful');
      return result;
    } catch (e) {
      console.error('❌ [Backend] Refresh Token Verification Failed:', e.message);
      // If refresh fails, clear the cookie
      res.clearCookie('refresh_token');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Redirects to Google automatically
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // This is the traditional redirect flow. Harder to pass 'isTestMode' here without state param.
    // For the demo, we use the manual /exchange endpoint, so this one can remain simple or use default.
    // We'll leave it as is for now as the user uses the manual flow.
    const { access_token } = await this.authService.login(req.user); // Default mode
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?token=${access_token}&login_success=true`);
  }

  @Post('exchange') // Manual exchange for Playground
  async exchangeToken(@Body() body: { code: string; clientId: string; clientSecret: string; redirectUri: string; expiresInSeconds?: number; refreshTokenExpiresInSeconds?: number }, @Res({ passthrough: true }) res) {
    const { code, redirectUri, expiresInSeconds, refreshTokenExpiresInSeconds } = body;
    // Use Environment variables for sensitive data (Secret)
    const clientId = body.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = body.clientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET is not configured in backend .env');
    }

    const result = await this.authService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri, expiresInSeconds, refreshTokenExpiresInSeconds);
    
    // Set Refresh Token Cookie for Google Login too!
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
