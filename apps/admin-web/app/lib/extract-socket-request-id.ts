/**
 * Resolves unified-request id from `request.created` / `request.updated` payloads.
 * Supports `{ request: { id } }` and optional `{ data: { request: { id } } }` without
 * mis-reading unrelated top-level `data` objects (which would drop `request`).
 */
export function extractSocketRequestId(payload: unknown): string | null {
  if (payload == null) return null;

  let root: Record<string, unknown>;
  if (typeof payload === 'string') {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      root = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof payload === 'object' && !Array.isArray(payload)) {
    root = payload as Record<string, unknown>;
  } else {
    return null;
  }

  const readId = (request: unknown): string | null => {
    if (!request || typeof request !== 'object' || Array.isArray(request)) return null;
    const o = request as Record<string, unknown>;
    const raw = o.id;
    if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
    return null;
  };

  const fromRoot = readId(root.request);
  if (fromRoot) return fromRoot;

  const data = root.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const fromData = readId((data as Record<string, unknown>).request);
    if (fromData) return fromData;
  }

  return null;
}
