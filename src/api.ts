import * as core from '@actions/core';

export interface ApiResponse {
  success: boolean;
  snapshotUrl?: string;
  message?: string;
  [key: string]: unknown;
}

export async function sendSchemaToApi(
  apiUrl: string,
  schema: Record<string, unknown>,
  authToken: string
): Promise<ApiResponse> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(schema),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json() as ApiResponse;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      core.error(`Failed to send schema to API: ${error.message}`);
    }
    throw error;
  }
}
