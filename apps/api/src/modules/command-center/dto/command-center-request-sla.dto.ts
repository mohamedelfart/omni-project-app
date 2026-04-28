/**
 * SLA fields exposed to Command Center — mirrors `UnifiedRequest` DB columns only.
 */
export interface CommandCenterRequestSlaSnapshot {
  responseDueAt: Date | null;
  completionDueAt: Date | null;
  slaBreached: boolean;
  breachType: string | null;
  escalationLevel: number;
  firstBreachedAt: Date | null;
}
