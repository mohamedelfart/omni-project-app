import type { ProviderOperationalSignalReadModel } from '@quickrent/shared-types';

export function parseProviderOperationalSignalFromMetadata(metadata: unknown): ProviderOperationalSignalReadModel | null {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const attention = (metadata as Record<string, unknown>).providerOperationalAttention;
  if (attention == null || typeof attention !== 'object' || Array.isArray(attention)) {
    return null;
  }
  const a = attention as Record<string, unknown>;
  const latest = typeof a.lastIntent === 'string' ? a.lastIntent.trim() : '';
  const latestAt = typeof a.lastIntentAt === 'string' ? a.lastIntentAt.trim() : '';
  if (!latest || !latestAt) {
    return null;
  }
  const noteRaw = a.lastNote;
  const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim() : null;
  return { latest, latestAt, note, advisory: true };
}
