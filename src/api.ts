import * as core from "@actions/core";
import type { SnapshotReturn } from "./types";

export type SendSchemaParams = {
  apiUrl: string;
  schema: Record<string, unknown>;
  authToken: string;
  project: string;
  snapshotName: string;
  permanent?: boolean;
}

export async function sendSchemaToApi(params: SendSchemaParams): Promise<SnapshotReturn> {
  const { apiUrl, schema, authToken, project, snapshotName, permanent = false } = params;
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        schema,
        project,
        name: snapshotName,
        permanent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as SnapshotReturn;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      core.error(`Failed to send schema to API: ${error.message}`);
    }
    throw error;
  }
}
