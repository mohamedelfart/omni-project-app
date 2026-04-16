export function parseApiEnv(env: NodeJS.ProcessEnv) {
  return {
    API_PREFIX: env.API_PREFIX ?? '/api/v1',
    API_PORT: Number(env.API_PORT ?? 4000),
  };
}

