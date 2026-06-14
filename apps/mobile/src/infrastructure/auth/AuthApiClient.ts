import type { AuthTokensDto, LoginDto, RegisterDto, RefreshDto } from '@academia/contracts';

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

type FetchFn = typeof fetch;

/**
 * Thin HTTP client for the backend auth endpoints (`/auth/register|login|refresh`).
 * `fetch` is injected so the client is unit-testable without a network or native runtime.
 */
export class AuthApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  register(input: RegisterDto): Promise<AuthTokensDto> {
    return this.post('/auth/register', input);
  }

  login(input: LoginDto): Promise<AuthTokensDto> {
    return this.post('/auth/login', input);
  }

  refresh(input: RefreshDto): Promise<AuthTokensDto> {
    return this.post('/auth/refresh', input);
  }

  private async post(path: string, body: unknown): Promise<AuthTokensDto> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new AuthApiError(`Auth request failed: ${response.status}`, response.status);
    }
    return (await response.json()) as AuthTokensDto;
  }
}
