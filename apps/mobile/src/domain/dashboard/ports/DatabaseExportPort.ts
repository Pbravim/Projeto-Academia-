export interface DatabaseExportPort {
  checkpointWal(): Promise<void>;
  databaseFileName: string;
}
