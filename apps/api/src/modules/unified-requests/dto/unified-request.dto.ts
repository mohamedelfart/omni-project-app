import { IsArray, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUnifiedRequestDto {
  @IsString()
  requestType!: string;

  @IsString()
  serviceType!: string;

  @IsString()
  country!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyIds?: string[];

  @IsOptional()
  @IsDateString()
  preferredTime?: string;

  @IsOptional()
  @IsString()
  locationLabel?: string;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;

  @IsOptional()
  @IsNumber()
  targetLat?: number;

  @IsOptional()
  @IsNumber()
  targetLng?: number;

  @IsOptional()
  @IsNumber()
  pickupLat?: number;

  @IsOptional()
  @IsNumber()
  pickupLng?: number;

  @IsOptional()
  @IsNumber()
  dropoffLat?: number;

  @IsOptional()
  @IsNumber()
  dropoffLng?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class DispatchInstructionDto {
  @IsString()
  instructionType!: string;

  @IsOptional()
  payload?: Record<string, unknown>;
}