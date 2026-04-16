import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export const REQUEST_TYPES = ['cleaning', 'moving', 'maintenance'] as const;
export const REQUEST_STATUSES = ['pending', 'assigned', 'in_progress', 'completed'] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

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

export class CreateRealtimeRequestDto {
  @IsIn(REQUEST_TYPES)
  type!: RequestType;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyIds?: string[];
}

export class AssignVendorDto {
  @IsString()
  vendorId!: string;
}

export class UpdateRealtimeRequestStatusDto {
  @IsIn(['assigned', 'in_progress', 'completed'])
  status!: Exclude<RequestStatus, 'pending'>;
}