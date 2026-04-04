import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMoveInDto {
  @IsDateString()
  moveDate!: string;

  @IsString()
  pickupAddress!: string;

  @IsString()
  dropoffAddress!: string;

  @IsOptional()
  @IsNumber()
  estimatedCostMinor?: number;
}

export class CreateMaintenanceDto {
  @IsString()
  category!: string;

  @IsString()
  severity!: string;

  @IsOptional()
  @IsDateString()
  preferredVisitAt?: string;
}

export class CreateCleaningDto {
  @IsDateString()
  serviceDate!: string;

  @IsNumber()
  durationHours!: number;
}

export class CreateAirportTransferDto {
  @IsDateString()
  pickupAt!: string;

  @IsNumber()
  pickupLat!: number;

  @IsNumber()
  pickupLng!: number;

  @IsNumber()
  dropoffLat!: number;

  @IsNumber()
  dropoffLng!: number;

  @IsOptional()
  @IsString()
  flightNumber?: string;
}

export class CreatePaidServiceDto {
  @IsString()
  requestType!: string;

  @IsString()
  serviceType!: string;

  @IsString()
  city!: string;
}