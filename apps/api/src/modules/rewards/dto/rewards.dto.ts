import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOfferDto {
  @IsString()
  title!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsInt()
  discountMinor?: number;
}