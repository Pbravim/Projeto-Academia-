export interface StoredTokens {
  email: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Persistence boundary for the auth session. Implementations decide where the
 * tokens live (SQLite settings today; expo-secure-store once the native module
 * is part of the build). Kept as an interface so the session logic stays
 * unit-testable with a fake.
 */
export interface TokenStore {
  load(): Promise<StoredTokens | null>;
  save(tokens: StoredTokens): Promise<void>;
  clear(): Promise<void>;
}
