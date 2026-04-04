import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  unifiedRequestId?: string;

  @IsNumber()
  amountMinor!: number;

  @IsString()
  currency!: string;

  @IsString()
  provider!: string;
}

export class UpdatePaymentStatusDto {
  @IsString()
  status!: string;
}