import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('profile')
export class ProfileController {
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getProfile(@Request() req) {
    return {
      message: 'This is a protected route. If you see this, your Backend JWT is working!',
      user: req.user,
    };
  }
}
