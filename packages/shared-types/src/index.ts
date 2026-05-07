export type UserRole = 'tenant' | 'guest' | 'landlord' | 'provider' | 'admin' | 'command-center';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type {
  TicketAction,
  TicketActionCreatedBy,
  TicketActionType,
  TicketId,
} from './ticket-action';

export type {
  ProviderOperationalSignalReadModel,
  TenantOperationalJourneyStep,
} from './operational-experience';

export type {
  CommandCenterBrainAutoAssignReadiness,
  CommandCenterBrainNextBestAction,
  CommandCenterBrainPriority,
  CommandCenterBrainProviderIntelligence,
  CommandCenterBrainProviderSuitability,
  CommandCenterBrainProviderSuitabilityCandidate,
  CommandCenterBrainProviderSuitabilityCurrent,
  CommandCenterBrainReadModel,
} from './command-center-brain';

export {
  COMMAND_CENTER_BRAIN_NEXT_BEST_ACTIONS,
  isCommandCenterBrainNextBestAction,
} from './command-center-brain';

