/** Latest provider advisory signal on a request (Command Center / realtime). */
export type ProviderOperationalSignalReadModel = {
  latest: string;
  latestAt: string;
  note: string | null;
  advisory: true;
};

/** Calm tenant-facing journey step (derived from TicketAction + milestones). */
export type TenantOperationalJourneyStep = {
  at: string;
  label: string;
  kind: 'coordination' | 'provider' | 'signal' | 'status';
  advisory?: boolean;
};
