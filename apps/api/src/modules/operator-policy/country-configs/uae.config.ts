import { OperatorServiceRule } from '../../operator-policy/operator-policy.service';

/** UAE country service rules — all amounts in minor units (AED × 100) */
export const UAE_SERVICE_RULES: OperatorServiceRule[] = [
  {
    serviceType: 'move-in',
    enabled: true,
    category: 'hybrid',
    basePriceMinor: 60000,   // 600 AED
    freeCapMinor: 60000,     // Free up to 600 AED
    requiresVendor: true,
  },
  {
    serviceType: 'cleaning',
    enabled: true,
    category: 'hybrid',
    basePriceMinor: 20000,   // 200 AED
    freeCapMinor: 20000,     // First cleaning free
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
    basePriceMinor: 15000,   // 150 AED
    freeCapMinor: 0,
    requiresVendor: true,
  },
  {
    serviceType: 'grocery-delivery',
    enabled: true,
    category: 'paid',
    basePriceMinor: 2000,
    freeCapMinor: 0,
    requiresVendor: true,
  },
  {
    serviceType: 'concierge',
    enabled: true,
    category: 'free',
    basePriceMinor: 0,
    freeCapMinor: 0,
    requiresVendor: false,
  },
];

export const UAE_CONFIG = {
  code: 'AE',
  name: 'United Arab Emirates',
  defaultCurrency: 'AED',
  timezone: 'Asia/Dubai',
  defaultLanguage: 'en',
  supportedLanguages: ['ar', 'en'],
  taxPercent: 5,             // 5% VAT
  maintenanceSlaHours: 12,
  freeMoveInCapMinor: 60000,
  googleRegionCode: 'AE',
  cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  services: UAE_SERVICE_RULES,
};
