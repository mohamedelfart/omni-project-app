export type UserRole = 'tenant' | 'landlord' | 'provider' | 'admin' | 'command-center';

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

