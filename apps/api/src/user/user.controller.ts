import { Controller, Get, Patch, Body, UseGuards, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    const updatedUser = await this.userService.updateProfile(user.sub, dto);
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      profileImage: updatedUser.profileImage,
      bio: updatedUser.bio,
    };
  }

  @Get('check-nickname')
  async checkNickname(
    @Query('nickname') nickname: string,
    @Query('excludeUserId') excludeUserId?: string
  ) {
    const available = await this.userService.checkNicknameAvailable(nickname, excludeUserId);
    return { available };
  }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    const available = await this.userService.checkEmailAvailable(email);
    return { available };
  }
}
