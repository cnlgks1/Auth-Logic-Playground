import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req, @Res({ passthrough: true }) res, @Body() body: { expiresInSeconds?: number }) {
    const expiresInSeconds = body.expiresInSeconds;
    const { access_token, refresh_token, user, expiresIn } = await this.authService.login(req.user, expiresInSeconds);

    // Set Refresh Token as HTTP-Only Cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    return { access_token, user, expiresIn };
  }

  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const refreshToken = req.cookies['refresh_token'];
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    try {
      const result = await this.authService.refresh(refreshToken);
      return result;
    } catch (e) {
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
  async exchangeToken(@Body() body: { code: string; clientId: string; clientSecret: string; redirectUri: string; expiresInSeconds?: number }, @Res({ passthrough: true }) res) {
    const { code, redirectUri, expiresInSeconds } = body;
    // Use Environment variables for sensitive data (Secret)
    const clientId = body.clientId || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET is not configured in backend .env');
    }

    const result = await this.authService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri, expiresInSeconds);
    
    // Set Refresh Token Cookie for Google Login too!
    if (result.backend?.refresh_token) {
       res.cookie('refresh_token', result.backend.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
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
