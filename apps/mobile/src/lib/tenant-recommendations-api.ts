import { apiRequest } from './api-client';

export type RecommendationBadge = 'free' | 'priority' | 'suggested' | 'new';

export type TenantJourneyStage =
  | 'new-to-platform'
  | 'browsing'
  | 'post-viewing'
  | 'moving-in'
  | 'settled'
  | 'recurring';

export type TenantServiceRecommendation = {
  serviceType: string;
  displayName: string;
  tagline: string;
  badge: RecommendationBadge;
  score: number;
  freeCapMinor: number;
  remainingFreeMinor: number | null;
  currency: string;
  reason: string;
  navigateTo: string;
};

export type TenantRecommendationsResponse = {
  countryCode: string;
  currency: string;
  journeyContext: {
    stage: TenantJourneyStage;
    recentServiceTypes: string[];
    hasActiveRequests: boolean;
    totalRequests: number;
    lastServiceType: string | null;
  };
  top: TenantServiceRecommendation[];
  all: TenantServiceRecommendation[];
  freeServiceHighlight: string | null;
  policyAware: boolean;
  generatedAt: string;
};

export async function fetchTenantRecommendations(countryCode?: string): Promise<TenantRecommendationsResponse> {
  const query = countryCode ? `?countryCode=${encodeURIComponent(countryCode)}` : '';
  return apiRequest<TenantRecommendationsResponse>(`tenant-intelligence/recommendations${query}`);
}
