import { QATAR_CONFIG } from './qatar.config';
import { UAE_CONFIG } from './uae.config';
import { SAUDI_CONFIG } from './saudi.config';
export { EGYPT_READY_CONFIG } from './egypt.config';
import { EGYPT_READY_CONFIG } from './egypt.config';
import { OperatorServiceRule } from '../operator-policy.service';

export type CountryPackStatus = 'active' | 'supported' | 'ready';

export interface RoutingPolicyConfig {
  strictServiceTypeMatch: boolean;
  allowCountryFallbackProvider: boolean;
  preferFallbackEnabledProvider: boolean;
}

export interface PerkPolicyConfig {
  moveInCompletionEnabled: boolean;
  firstServiceEnabled: boolean;
  milestoneEnabled: boolean;
  moveInCompletionServiceTypes: string[];
}

export interface FinancialPolicyConfig {
  rentMarginMode: 'service-fee-based';
  excessChargeMode: 'invoice-pending-payment';
  defaultServiceCapMinor: number;
}

export interface AdapterPolicyConfig {
  integrationBoundary: 'core-dispatch';
  providerSelectionSource: 'orchestrator';
}

export interface CountryPolicyExtensions {
  routing?: RoutingPolicyConfig;
  perks?: PerkPolicyConfig;
  financial?: FinancialPolicyConfig;
  adapters?: AdapterPolicyConfig;
}

export interface CountryDefinition {
  code: string;
  name: string;
  defaultCurrency: string;
  timezone: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  taxPercent: number;
  maintenanceSlaHours: number;
  /** Fallback SLA when no `SlaPolicyRule` row matches (minutes from request `createdAt`). */
  slaFallbackMinutes: {
    responseSlaMinutes: number;
    completionSlaMinutes: number;
  };
  freeMoveInCapMinor: number;
  googleRegionCode: string;
  cities: string[];
  services: OperatorServiceRule[];
  policies?: CountryPolicyExtensions;
}

/** Registry of all supported country configurations.
 *  To add a new country: create a file in this folder and add its config here.
 *  No other code change is required. */
export const COUNTRY_REGISTRY: Record<string, CountryDefinition> = {
  QA: QATAR_CONFIG,
  AE: UAE_CONFIG,
  SA: SAUDI_CONFIG,
};

export const COUNTRY_PACK_STATUS: Record<string, CountryPackStatus> = {
  QA: 'active',
  AE: 'supported',
  SA: 'supported',
  EG: 'ready',
};

export function getCountryDefinition(code: string): CountryDefinition | undefined {
  return COUNTRY_REGISTRY[code.toUpperCase()];
}

export function getSupportedCountryCodes(): string[] {
  return Object.keys(COUNTRY_REGISTRY);
}

export function getActiveCountryCode(): string {
  return 'QA';
}

export function getCountryPackStatus(code: string): CountryPackStatus {
  return COUNTRY_PACK_STATUS[code.toUpperCase()] ?? 'supported';
}

export function listCountryPackStatuses() {
  return Object.entries(COUNTRY_PACK_STATUS).map(([code, status]) => ({ code, status }));
}

export function getPreparedCountryDefinition(code: string): CountryDefinition | undefined {
  const normalized = code.toUpperCase();
  if (normalized === 'EG') {
    return EGYPT_READY_CONFIG;
  }

  return getCountryDefinition(normalized);
}
