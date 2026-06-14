/**
 * Base URL of the backend API (NestJS, global prefix `api/v1`).
 *
 * Local-only for now: defaults to the docker-compose API on localhost. Override
 * via the `EXPO_PUBLIC_API_URL` env var when a deployed backend exists. On a
 * physical device, localhost won't resolve to your machine — point this at the
 * host's LAN IP (e.g. http://192.168.x.x:3000/api/v1).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
