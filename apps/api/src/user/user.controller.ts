import { Controller, Get, Patch, Post, Delete, Body, UseGuards, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
  isActive: boolean;
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    const updatedUser = await this.userService.updateProfile(user.id, dto);
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

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.userService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: '비밀번호가 변경되었습니다.' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    await this.userService.deleteAccount(user.id, dto.password);
    return { message: '회원 탈퇴가 완료되었습니다.' };
  }
}
