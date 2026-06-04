import { uuidv7 } from 'uuidv7';

/**
 * Globally-unique, time-ordered identifier (UUIDv7) for user-owned rows.
 * The optional `prefix` argument is accepted for backward compatibility with
 * existing call sites but is ignored — IDs are now opaque UUIDs.
 */
export function generateId(_prefix?: string): string {
  return uuidv7();
}
