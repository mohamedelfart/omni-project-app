import type { CountryDefinition } from './index';
import { OperatorServiceRule } from '../../operator-policy/operator-policy.service';

export const EGYPT_READY_SERVICE_RULES: OperatorServiceRule[] = [
  {
    serviceType: 'move-in',
    enabled: true,
    category: 'hybrid',
    basePriceMinor: 120000,
    freeCapMinor: 120000,
    requiresVendor: true,
  },
  {
    serviceType: 'cleaning',
    enabled: true,
    category: 'paid',
    basePriceMinor: 35000,
    freeCapMinor: 0,
    requiresVendor: true,
  },
  {
    serviceType: 'maintenance',
    enabled: true,
    category: 'paid',
    basePriceMinor: 0,
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
];

export const EGYPT_READY_CONFIG = {
  code: 'EG',
  name: 'Egypt',
  defaultCurrency: 'EGP',
  timezone: 'Africa/Cairo',
  defaultLanguage: 'ar',
  supportedLanguages: ['ar', 'en'],
  taxPercent: 14,
  maintenanceSlaHours: 24,
  freeMoveInCapMinor: 120000,
  googleRegionCode: 'EG',
  cities: ['Cairo', 'New Cairo', '6th of October', 'Alexandria'],
  services: EGYPT_READY_SERVICE_RULES,
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
      defaultServiceCapMinor: 120000,
    },
    adapters: {
      integrationBoundary: 'core-dispatch',
      providerSelectionSource: 'orchestrator',
    },
  },
} satisfies CountryDefinition;