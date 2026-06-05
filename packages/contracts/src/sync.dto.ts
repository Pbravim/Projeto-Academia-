export interface SyncRow {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncRequest {
  since: string | null;
  changes: SyncRow[];
}

export interface SyncResponse {
  serverChanges: SyncRow[];
  newCursor: string;
}
