/** Advisory operational signals from assigned providers (no lifecycle authority). */
export const PROVIDER_OPERATIONAL_INTENT_CODES = [
  'ARRIVED_ON_SITE',
  'RUNNING_LATE',
  'TENANT_UNREACHABLE',
  'BLOCKED_ACCESS',
  'REQUEST_SUPPORT',
  'VIEWING_STARTED',
  'VIEWING_COMPLETED',
] as const;

export type ProviderOperationalIntentCode = (typeof PROVIDER_OPERATIONAL_INTENT_CODES)[number];

export function isProviderOperationalIntentCode(value: string): value is ProviderOperationalIntentCode {
  return (PROVIDER_OPERATIONAL_INTENT_CODES as readonly string[]).includes(value);
}

/** Calm tenant-facing copy — not raw enum strings. */
export const PROVIDER_OPERATIONAL_INTENT_TENANT_LABELS: Record<ProviderOperationalIntentCode, string> = {
  ARRIVED_ON_SITE: 'Your provider has arrived',
  RUNNING_LATE: 'Your visit may start a little later',
  TENANT_UNREACHABLE: "We couldn't reach you just now",
  BLOCKED_ACCESS: 'Access to the property was delayed',
  REQUEST_SUPPORT: 'Support is assisting your visit',
  VIEWING_STARTED: 'Your viewing has started',
  VIEWING_COMPLETED: 'Your viewing is complete',
};
