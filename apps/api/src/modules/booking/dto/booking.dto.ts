import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBookingRequestDto {
  @IsString()
  propertyId!: string;

  @IsString()
  moveInDateISO!: string;

  @IsInt()
  termMonths!: number;

  @IsOptional()
  @IsString()
  offerId?: string;
}