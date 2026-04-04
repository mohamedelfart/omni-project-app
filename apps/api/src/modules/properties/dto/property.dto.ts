import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class PropertyMediaDto {
  @IsString()
  mediaType!: string;

  @IsString()
  url!: string;
}

export class CreatePropertyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  countryCode!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsString()
  propertyType!: string;

  @IsString()
  addressLine1!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsNumber()
  monthlyRentMinor!: number;

  @IsNumber()
  securityDepositMinor!: number;

  @IsString()
  currency!: string;

  @IsNumber()
  bedrooms!: number;

  @IsNumber()
  bathrooms!: number;

  @IsNumber()
  areaSqm!: number;

  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyMediaDto)
  media?: PropertyMediaDto[];
}

export class UpdatePropertyDto extends CreatePropertyDto {}

export class SearchPropertiesDto {
  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;
}