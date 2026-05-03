/**
 * Command Center “Brain” read-model: computed on the API and echoed by admin UIs.
 * Single definition for API + admin-web (no duplicated string unions).
 */
export const COMMAND_CENTER_BRAIN_NEXT_BEST_ACTIONS = [
  'ASSIGN_PROVIDER',
  'REVIEW_ESCALATION',
  'CLEAR_ESCALATION',
  'MONITOR_SLA',
  'MONITOR_EXECUTION',
  'REASSIGN_PROVIDER',
  'URGENT_INTERVENTION',
] as const;

export type CommandCenterBrainNextBestAction = (typeof COMMAND_CENTER_BRAIN_NEXT_BEST_ACTIONS)[number];

export function isCommandCenterBrainNextBestAction(value: unknown): value is CommandCenterBrainNextBestAction {
  return typeof value === 'string' && (COMMAND_CENTER_BRAIN_NEXT_BEST_ACTIONS as readonly string[]).includes(value);
}

export type CommandCenterBrainPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Qualitative provider read-model only — no scores, ranks, or auto-selection (Brain v4). */
export type CommandCenterBrainProviderIntelligence = {
  signals: string[];
  recommendations: string[];
  reasons: string[];
};

/** Brain v5 — suitability from aggregated UnifiedRequest read-model only (no auto-assign). */
export type CommandCenterBrainProviderSuitabilityCurrent = {
  providerId: string;
  score: number;
  reasons: string[];
};

export type CommandCenterBrainProviderSuitabilityCandidate = {
  providerId: string;
  score: number;
  reasons: string[];
};

export type CommandCenterBrainProviderSuitability = {
  currentProvider: CommandCenterBrainProviderSuitabilityCurrent | null;
  candidates: CommandCenterBrainProviderSuitabilityCandidate[];
  recommendedProviderId: string | null;
};

export type CommandCenterBrainReadModel = {
  priority: CommandCenterBrainPriority;
  alerts: string[];
  recommendations: string[];
  reasons: string[];
  nextBestAction: CommandCenterBrainNextBestAction;
  riskScore: number;
  riskReasons: string[];
  providerIntelligence: CommandCenterBrainProviderIntelligence;
  providerSuitability?: CommandCenterBrainProviderSuitability;
};
