import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  phoneNumber?: string;

  @MinLength(8)
  password!: string;

  @IsString()
  @Length(2, 120)
  fullName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}

export class PhoneOtpRequestDto {
  @IsString()
  @Length(8, 20)
  phoneNumber!: string;
}

export class PhoneOtpVerifyDto {
  @IsString()
  @Length(8, 20)
  phoneNumber!: string;

  @IsString()
  @Length(4, 8)
  otp!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class VerifyAccountDto {
  @IsString()
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @MinLength(8)
  newPassword!: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class CompleteProfileDto {
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  preferredCity?: string;
}

export class SwitchProviderContextDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;
}
