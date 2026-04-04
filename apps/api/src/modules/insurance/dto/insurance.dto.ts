import { IsDateString, IsInt, IsString } from 'class-validator';

export class SubscribeInsuranceDto {
  @IsString()
  planId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class CreateInsuranceClaimDto {
  @IsString()
  subscriptionId!: string;

  @IsDateString()
  incidentDate!: string;

  @IsInt()
  amountClaimedMinor!: number;

  @IsString()
  description!: string;
}