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
  CommandCenterBrainNextBestAction,
  CommandCenterBrainPriority,
  CommandCenterBrainProviderIntelligence,
  CommandCenterBrainReadModel,
} from './command-center-brain';

export {
  COMMAND_CENTER_BRAIN_NEXT_BEST_ACTIONS,
  isCommandCenterBrainNextBestAction,
} from './command-center-brain';

