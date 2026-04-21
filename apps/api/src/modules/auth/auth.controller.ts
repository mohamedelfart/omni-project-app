import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CompleteProfileDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  PhoneOtpRequestDto,
  PhoneOtpVerifyDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyAccountDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('guest-session')
  guestSession() {
    return this.authService.createGuestSession();
  }

  @Post('phone/request-otp')
  requestPhoneOtp(@Body() dto: PhoneOtpRequestDto) {
    return this.authService.requestPhoneOtp(dto);
  }

  @Post('phone/verify-otp')
  verifyPhoneOtp(@Body() dto: PhoneOtpVerifyDto) {
    return this.authService.verifyPhoneOtp(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('verify-account')
  verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyAccount(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: { id: string }, @Body() dto: LogoutDto) {
    return this.authService.logout(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('complete-profile')
  completeProfile(@CurrentUser() user: { id: string }, @Body() dto: CompleteProfileDto) {
    return this.authService.completeProfile(user.id, dto);
  }
}
