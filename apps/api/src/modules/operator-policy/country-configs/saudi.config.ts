import { OperatorServiceRule } from '../../operator-policy/operator-policy.service';

/** Saudi Arabia country service rules — all amounts in minor units (SAR × 100) */
export const SAUDI_SERVICE_RULES: OperatorServiceRule[] = [
  {
    serviceType: 'move-in',
    enabled: true,
    category: 'hybrid',
    basePriceMinor: 75000,   // 750 SAR
    freeCapMinor: 75000,     // Free up to 750 SAR
    requiresVendor: true,
  },
  {
    serviceType: 'cleaning',
    enabled: true,
    category: 'paid',
    basePriceMinor: 25000,
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
  {
    serviceType: 'airport-transfer',
    enabled: true,
    category: 'paid',
    basePriceMinor: 12000,   // 120 SAR
    freeCapMinor: 0,
    requiresVendor: true,
  },
];

export const SAUDI_CONFIG = {
  code: 'SA',
  name: 'Saudi Arabia',
  defaultCurrency: 'SAR',
  timezone: 'Asia/Riyadh',
  defaultLanguage: 'ar',
  supportedLanguages: ['ar', 'en'],
  taxPercent: 15,
  maintenanceSlaHours: 24,
  freeMoveInCapMinor: 75000,
  googleRegionCode: 'SA',
  cities: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina', 'NEOM'],
  services: SAUDI_SERVICE_RULES,
};
