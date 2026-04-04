import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateTenantProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  preferredCity?: string;

  @IsOptional()
  @IsString({ each: true })
  preferredDistricts?: string[];
}

export class AssignRoleDto {
  @IsString()
  roleCode!: string;
}