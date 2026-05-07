import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PROVIDER_OPERATIONAL_INTENT_CODES } from '../../orchestrator/provider-operational-intents';

const INTENT_VALUES = [...PROVIDER_OPERATIONAL_INTENT_CODES] as [string, ...string[]];

export class AppendProviderOperationalIntentDto {
  @IsIn(INTENT_VALUES)
  intent!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
