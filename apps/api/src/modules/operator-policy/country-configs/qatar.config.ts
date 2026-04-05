import type { CountryDefinition } from './index';
import { OperatorServiceRule } from '../../operator-policy/operator-policy.service';

/** Qatar country service rules — all amounts in minor units (QAR × 100) */
export const QATAR_SERVICE_RULES: OperatorServiceRule[] = [
  {
    serviceType: 'move-in',
    enabled: true,
    category: 'hybrid',
    basePriceMinor: 50000,   // 500 QAR
    freeCapMinor: 50000,     // Free up to 500 QAR
    requiresVendor: true,
  },
  {
    serviceType: 'cleaning',
    enabled: true,
    category: 'paid',
    basePriceMinor: 15000,   // 150 QAR
    freeCapMinor: 0,
    requiresVendor: true,
  },
  {
    serviceType: 'maintenance',
    enabled: true,
    category: 'paid',
    basePriceMinor: 0,       // Variable pricing
    freeCapMinor: 0,
    requiresVendor: true,
  },
  {
    serviceType: 'viewing-transport',
    enabled: true,
    category: 'free',
    basePriceMinor: 0,
    freeCapMinor: 0,
    requiresVendor: true,
  },
  {
    serviceType: 'airport-transfer',
    enabled: true,
    category: 'paid',
    basePriceMinor: 8000,    // 80 QAR
    freeCapMinor: 0,
    requiresVendor: true,
  },
  {
    serviceType: 'grocery-delivery',
    enabled: true,
    category: 'paid',
    basePriceMinor: 1500,    // 15 QAR delivery fee
    freeCapMinor: 0,
    requiresVendor: true,
  },
];

export const QATAR_CONFIG = {
  code: 'QA',
  name: 'Qatar',
  defaultCurrency: 'QAR',
  timezone: 'Asia/Qatar',
  defaultLanguage: 'ar',
  supportedLanguages: ['ar', 'en'],
  taxPercent: 0,
  maintenanceSlaHours: 24,
  freeMoveInCapMinor: 50000,
  googleRegionCode: 'QA',
  cities: ['Doha', 'Lusail', 'Al Rayyan', 'Al Wakrah', 'Al Khor'],
  services: QATAR_SERVICE_RULES,
  policies: {
    routing: {
      strictServiceTypeMatch: true,
      allowCountryFallbackProvider: true,
      preferFallbackEnabledProvider: true,
    },
    perks: {
      moveInCompletionEnabled: true,
      firstServiceEnabled: true,
      milestoneEnabled: true,
      moveInCompletionServiceTypes: ['move-in'],
    },
    financial: {
      rentMarginMode: 'service-fee-based',
      excessChargeMode: 'invoice-pending-payment',
      defaultServiceCapMinor: 50000,
    },
    adapters: {
      integrationBoundary: 'core-dispatch',
      providerSelectionSource: 'orchestrator',
    },
  },
} satisfies CountryDefinition;
