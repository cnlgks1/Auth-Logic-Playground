import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user) {
        // For demo simplicity with seeded admin
        // In real app: await bcrypt.compare(pass, user.password)
        if (user.password === pass) {
            const { password, ...result } = user;
            return result;
        }
    }
    return null;
  }



  // Unified Token Generation Logic
  private async generateTokens(user: any, expiresInSeconds?: number) {
    const payload = { 
        username: user.username, 
        sub: user.id || user.userId || user.sub, // Consistently use ID
        email: user.email 
    };
    
    // Default to 15m (900s) if no custom expiry provided
    const atExpires = expiresInSeconds ? `${expiresInSeconds}s` : '15m';
    const rtExpires = '7d';

    const accessToken = this.jwtService.sign(payload, { expiresIn: atExpires });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: rtExpires });

    // Save Refresh Token to DB (Important for explicit refresh logic)
    // We should probably hash it, but for explicit demo flow, storing plain might be clearer logs?
    // Let's store it as is for the demo to match EXACTLY what the client sends back.
    if (user.id || user.userId) {
        await this.usersService.updateRefreshToken(user.id || user.userId, refreshToken);
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
      expiresIn: atExpires
    };
  }

  async login(user: any, expiresInSeconds?: number) {
    return this.generateTokens(user, expiresInSeconds);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      // In a real app, check if user still exists or if token is revoked in DB
      const newPayload = { username: payload.username, sub: payload.sub, email: payload.email };
      
      return {
        access_token: this.jwtService.sign(newPayload, { expiresIn: '15m' }), // Refresh always gives 15m for now (or could inherit mode)
      };
    } catch (e) {
      throw new Error('Invalid refresh token');
    }
  }

  async exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string, expiresInSeconds?: number) {
    try {
      // 1. Exchange code for Google Token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Token Exchange Error:', errorText);
        throw new Error(`Failed to exchange token: ${errorText}`);
      }

      const googleTokens = await response.json();

      // 2. Fetch User Profile from Google
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${googleTokens.access_token}` },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Google UserInfo Error:', errorText);
        throw new Error('Failed to fetch user profile');
      }

      const googleUser = await profileResponse.json();

      // 3. Upsert User in DB to get internal ID (Fixes the "String vs Int" error)
      const dbUser = await this.usersService.upsertGoogleUser(googleUser);

      // 4. Generate Backend JWTs (Access + Refresh)
      // generateTokens will now use dbUser.id (Int) for the refresh token update
      const backendTokens = await this.generateTokens(dbUser, expiresInSeconds);

      // 5. Return everything
      return {
        google: googleTokens,
        user: dbUser, // Return DB user structure
        backend: backendTokens, 
      };
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }
}
