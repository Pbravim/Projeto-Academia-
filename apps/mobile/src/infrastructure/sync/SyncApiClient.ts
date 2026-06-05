import type { SyncRequest, SyncResponse } from '@academia/contracts';

export class SyncApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getAccessToken: () => Promise<string>,
  ) {}

  async sync(request: SyncRequest): Promise<SyncResponse> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = Object.assign(
        new Error(`Sync failed: ${response.status}`),
        { status: response.status },
      );
      throw error;
    }
    return response.json() as Promise<SyncResponse>;
  }
}
