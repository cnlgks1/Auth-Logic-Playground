import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ProfileController } from './profile.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'secretKey',
            signOptions: { expiresIn: '1h' },
        }),
        inject: [ConfigService],
    }),
    UsersModule,
  ],
  controllers: [AuthController, ProfileController],
  providers: [AuthService, GoogleStrategy, JwtStrategy, LocalStrategy],
})
export class AuthModule {}
