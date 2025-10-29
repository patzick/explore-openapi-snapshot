import * as core from "@actions/core";
import type { ForkContext, SnapshotReturn } from "./types";

export type SendSchemaParams = {
  apiUrl: string;
  schema: Record<string, unknown>;
  oidcToken?: string;
  project: string;
  snapshotName?: string;
  forkContext?: ForkContext;
};

export async function sendSchemaToApi(
  params: SendSchemaParams,
): Promise<SnapshotReturn> {
  const { apiUrl, schema, oidcToken, project, snapshotName, forkContext } =
    params;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Determine API endpoint and authentication method
    let targetUrl = apiUrl;
    const body: Record<string, unknown> = {
      schema,
      project,
      snapshotName,
    };

    if (oidcToken) {
      // OIDC authentication for regular PRs and pushes
      headers.Authorization = `Bearer ${oidcToken}`;
    } else if (
      forkContext?.targetRepository &&
      forkContext?.targetPullRequest &&
      forkContext?.commitSha
    ) {
      // Fork authentication for fork PRs
      targetUrl = `${apiUrl}-fork`;
      headers.Authorization = `Fork ${forkContext.targetRepository}`;
      body.forkContext = forkContext;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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
