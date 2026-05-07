import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** A1.7 Step 3C — command-center authority write for Provider dispatch base (numeric range only; null-island in service). */
export class UpdateProviderDispatchBaseDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  source?: string;
}
