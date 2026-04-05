import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  unifiedRequestId?: string;

  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  currency!: string;

  @IsString()
  provider!: string;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status!: PaymentStatus;
}