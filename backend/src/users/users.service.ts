import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Seed Admin User for Demo
    const admin = await this.prisma.user.findUnique({ where: { email: 'admin' } }); // Treating 'admin' as email for simplicity or add username field search
    if (!admin) {
        console.log('[DB] Seeding Admin User...');
        await this.prisma.user.create({
            data: {
                email: 'admin', // Demo: using 'admin' as email to match existing frontend
                username: 'admin',
                password: '1234', // Plaintext for demo
                provider: 'local',
                firstName: 'Admin',
                lastName: 'User'
            }
        });
    }
  }

  async findOne(email: string): Promise<User | null> {
    console.log(`[DB] SELECT * FROM User WHERE email = '${email}'`);
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    console.log(`[DB] INSERT INTO User (email, provider, ...) VALUES ('${data.email}', '${data.provider}', ...)`);
    return this.prisma.user.create({
      data,
    });
  }

  async updateRefreshToken(userId: number, refreshToken: string | null) {
    console.log(`[DB] UPDATE User SET refreshToken = '${refreshToken ? 'HashedToken...' : 'NULL'}' WHERE id = ${userId}`);
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    // In real app, we should hash tokens. For this demo, we compare direct strings or use lookup.
    // If we store the token directly (not recommended for production but ok for demo if clearly stated),
    // we can query by it.
    // However, usually we find user by payload ID then verify token.
    // Let's assume we find by ID from payload in AuthService, then verifying here?
    // Actually, let's just add a method to find by ID.
    return null; 
  }

  async findById(id: number): Promise<User | null> {
    console.log(`[DB] SELECT * FROM User WHERE id = ${id}`);
    return this.prisma.user.findUnique({ where: { id } });
  }
  
  // Upsert for OAuth
  async upsertGoogleUser(googleProfile: any): Promise<User> {
    console.log(`[DB] UPSERT User WHERE email = '${googleProfile.email}'`);
    return this.prisma.user.upsert({
      where: { email: googleProfile.email },
      update: {
        googleId: googleProfile.id,
        avatarUrl: googleProfile.picture,
        username: googleProfile.name || googleProfile.email.split('@')[0],
      },
      create: {
        email: googleProfile.email,
        googleId: googleProfile.id,
        avatarUrl: googleProfile.picture,
        username: googleProfile.name || googleProfile.email.split('@')[0],
        provider: 'google',
      },
    });
  }
}
