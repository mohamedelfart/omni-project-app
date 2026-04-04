import { QATAR_CONFIG } from './qatar.config';
import { UAE_CONFIG } from './uae.config';
import { SAUDI_CONFIG } from './saudi.config';
export { EGYPT_READY_CONFIG } from './egypt.config';
import { OperatorServiceRule } from '../operator-policy.service';

export interface CountryDefinition {
  code: string;
  name: string;
  defaultCurrency: string;
  timezone: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  taxPercent: number;
  maintenanceSlaHours: number;
  freeMoveInCapMinor: number;
  googleRegionCode: string;
  cities: string[];
  services: OperatorServiceRule[];
}

/** Registry of all supported country configurations.
 *  To add a new country: create a file in this folder and add its config here.
 *  No other code change is required. */
export const COUNTRY_REGISTRY: Record<string, CountryDefinition> = {
  QA: QATAR_CONFIG,
  AE: UAE_CONFIG,
  SA: SAUDI_CONFIG,
};

export function getCountryDefinition(code: string): CountryDefinition | undefined {
  return COUNTRY_REGISTRY[code.toUpperCase()];
}

export function getSupportedCountryCodes(): string[] {
  return Object.keys(COUNTRY_REGISTRY);
}
