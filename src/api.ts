import * as core from "@actions/core";
import type { SnapshotReturn } from "./types";

export type SendSchemaParams = {
  apiUrl: string;
  schema: Record<string, unknown>;
  authToken?: string;
  oidcToken?: string;
  project: string;
  snapshotName: string;
  permanent?: boolean;
  baseBranchName?: string;
};

export async function sendSchemaToApi(
  params: SendSchemaParams,
): Promise<SnapshotReturn> {
  const {
    apiUrl,
    schema,
    authToken,
    oidcToken,
    project,
    snapshotName,
    permanent = false,
    baseBranchName,
  } = params;

  // Determine which token to use (prefer OIDC, fallback to authToken)
  const token = oidcToken || authToken;
  if (!token) {
    throw new Error("Either authToken or oidcToken must be provided");
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        schema,
        project,
        name: snapshotName,
        permanent,
        ...(baseBranchName && { baseBranchName }),
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
