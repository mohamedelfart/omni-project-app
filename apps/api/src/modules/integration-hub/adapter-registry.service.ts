import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NormalizedIntegrationRequest } from './integration-contracts';

export type AdapterContractType = NormalizedIntegrationRequest['requestType'];

export type AdapterRegistryEntry = {
  adapterKey: string;
  contractType: AdapterContractType;
  supportedServiceTypes: string[];
  eligibleCountries: string[];
  featureFlag: string;
  simulatedDelayMs: number;
  simulatedLifecycle: string[];
};

@Injectable()
export class AdapterRegistryService {
  constructor(private readonly configService: ConfigService) {}

  private readonly entries: AdapterRegistryEntry[] = [
    {
      adapterKey: 'sim.transport.core',
      contractType: 'transport',
      supportedServiceTypes: ['viewing-transport', 'move-in', 'airport-transfer'],
      eligibleCountries: ['QA', 'AE', 'SA', 'EG'],
      featureFlag: 'SIM_ADAPTER_TRANSPORT_ENABLED',
      simulatedDelayMs: 120,
      simulatedLifecycle: ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'],
    },
    {
      adapterKey: 'sim.delivery.core',
      contractType: 'delivery',
      supportedServiceTypes: ['maintenance', 'cleaning'],
      eligibleCountries: ['QA', 'AE', 'SA', 'EG'],
      featureFlag: 'SIM_ADAPTER_DELIVERY_ENABLED',
      simulatedDelayMs: 140,
      simulatedLifecycle: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
    },
    {
      adapterKey: 'sim.stay.core',
      contractType: 'stay',
      supportedServiceTypes: ['temporary-stay', 'hotel-stay'],
      eligibleCountries: ['QA', 'AE', 'SA', 'EG'],
      featureFlag: 'SIM_ADAPTER_STAY_ENABLED',
      simulatedDelayMs: 180,
      simulatedLifecycle: ['UNDER_REVIEW', 'ASSIGNED', 'COMPLETED'],
    },
    {
      adapterKey: 'sim.commerce.core',
      contractType: 'commerce',
      supportedServiceTypes: ['pharmacy', 'grocery', 'commerce'],
      eligibleCountries: ['QA', 'AE', 'SA', 'EG'],
      featureFlag: 'SIM_ADAPTER_COMMERCE_ENABLED',
      simulatedDelayMs: 160,
      simulatedLifecycle: ['ASSIGNED', 'EN_ROUTE', 'COMPLETED'],
    },
    {
      adapterKey: 'sim.public-service.core',
      contractType: 'public-service',
      supportedServiceTypes: [
        'public-address-verification',
        'public-residency-registration',
        'public-lease-validation',
        'public-municipality-request',
        'public-utilities-integration',
      ],
      eligibleCountries: ['QA', 'AE', 'SA', 'EG'],
      featureFlag: 'SIM_ADAPTER_PUBLIC_SERVICE_ENABLED',
      simulatedDelayMs: 220,
      simulatedLifecycle: ['UNDER_REVIEW', 'IN_PROGRESS', 'COMPLETED'],
    },
    {
      adapterKey: 'sim.country-specific.core',
      contractType: 'country-specific',
      supportedServiceTypes: ['all'],
      eligibleCountries: ['QA', 'AE', 'SA', 'EG'],
      featureFlag: 'SIM_ADAPTER_COUNTRY_SPECIFIC_ENABLED',
      simulatedDelayMs: 200,
      simulatedLifecycle: ['UNDER_REVIEW', 'ASSIGNED', 'COMPLETED'],
    },
  ];

  listEntries() {
    return this.entries;
  }

  private isFeatureEnabled(flag: string) {
    const raw = this.configService.get<string>(flag);
    if (raw == null) {
      return true;
    }

    return raw.toLowerCase() === 'true';
  }

  resolve(params: {
    serviceType: string;
    countryCode: string;
    normalizedContractType: AdapterContractType;
  }) {
    const entry = this.entries.find((candidate) => {
      if (candidate.contractType !== params.normalizedContractType) {
        return false;
      }

      const supportsService = candidate.supportedServiceTypes.includes('all')
        || candidate.supportedServiceTypes.includes(params.serviceType);
      if (!supportsService) {
        return false;
      }

      const supportsCountry = candidate.eligibleCountries.includes(params.countryCode);
      if (!supportsCountry) {
        return false;
      }

      return this.isFeatureEnabled(candidate.featureFlag);
    });

    return entry ?? null;
  }
}