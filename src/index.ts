import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "node:fs/promises";
import { sendSchemaToApi } from "./api.js";
import { getOidcToken } from "./oidc.js";
import type { SnapshotReturn } from "./types.js";

/**
 * Add snapshot information to GitHub Actions workflow summary
 * This is used as a fallback when PR comments cannot be created (e.g., fork PRs)
 */
async function addWorkflowSummary(
  response: SnapshotReturn,
  project: string,
): Promise<void> {
  const { context } = github;
  const prNumber = context.payload.pull_request?.number;
  const baseBranch = context.payload.pull_request?.base?.ref;

  let summary = "## 📸 OpenAPI Snapshot\n\n";

  if (response.snapshot) {
    summary += "✅ **Snapshot created successfully!**\n\n";

    // Add snapshot URL
    summary += `🔗 **Snapshot URL:** [View Snapshot](https://explore-openapi.dev/view?project=${project}&snapshot=${response.snapshot.name})\n\n`;

    // Add compare URL if in PR context
    if (prNumber && baseBranch) {
      summary += `🔄 **Compare URL:** [Compare Changes](https://explore-openapi.dev/compare?project=${project}&baseSnapshot=${baseBranch}&featureSnapshot=${prNumber})\n\n`;
    }

    // Add snapshot details
    summary += "### Snapshot Details\n\n";
    summary += `- **Name:** \`${response.snapshot.name}\`\n`;
    summary += `- **Project:** \`${project}\`\n`;
    summary += `- **Size:** ${(response.snapshot.size / 1024).toFixed(2)} KB\n`;
    summary += `- **Status:** ${response.snapshot.status}\n`;

    if (response.sameAsBase) {
      summary += `\nℹ️ No changes detected compared to ${baseBranch}\n`;
    }

    if (response.message) {
      summary += `\n📝 ${response.message}\n`;
    }
  } else if (response.error) {
    summary += "❌ **Failed to create snapshot**\n\n";
    summary += `**Error:** ${response.error}\n`;
  }

  summary +=
    "\n---\n\n_💡 PR comment will be posted by the backend GitHub App (visible in the PR conversation)._\n";

  await core.summary.addRaw(summary).write();
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const schemaFile = core.getInput("schema-file", { required: true });
    const project = core.getInput("project", { required: true });
    const snapshotNameInput = core.getInput("snapshot-name");
    const authToken = core.getInput("auth-token", { required: false });
    const permanentInput = core.getInput("permanent");
    const useOidc = core.getInput("use-oidc", { required: false });
    const oidcAudience = core.getInput("oidc-audience", { required: false });

    const apiUrl = "https://editor-api.explore-openapi.dev/public/v1/snapshot";

    // Determine authentication method
    let oidcToken: string | undefined;
    const shouldUseOidc = useOidc.toLowerCase() === "true";

    if (shouldUseOidc) {
      // OIDC authentication (new method, works with forks)
      core.info("Using OIDC authentication (fork-friendly mode)");
      try {
        core.info("Requesting OIDC token from GitHub Actions...");
        oidcToken = await getOidcToken(
          oidcAudience || "https://explore-openapi.dev",
        );
        core.info("OIDC token obtained successfully");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        core.setFailed(
          `Failed to obtain OIDC token: ${errorMessage}. Make sure the workflow has 'id-token: write' permission.`,
        );
        return;
      }
    } else {
      // Legacy auth-token method
      core.info("Using auth-token authentication (legacy mode)");
      if (!authToken) {
        const message =
          "No authentication token provided. This is expected for external contributor PRs as secrets are not available. " +
          "A maintainer can manually approve and re-run this workflow, or use OIDC authentication by setting 'use-oidc: true'.";
        core.setFailed(message);
        return;
      }
    }

    // Generate snapshot name: PR number if in PR context, otherwise branch name
    let snapshotName = snapshotNameInput;
    if (!snapshotName) {
      if (github.context.payload.pull_request) {
        snapshotName = `${github.context.payload.pull_request.number}`;
      } else {
        // Extract branch/tag name from ref
        const ref = github.context.ref;
        if (ref.startsWith("refs/heads/")) {
          snapshotName = ref.replace("refs/heads/", "");
        } else if (ref.startsWith("refs/tags/")) {
          snapshotName = ref.replace("refs/tags/", "");
        } else {
          snapshotName = ref;
        }
      }
    }

    // Determine if snapshot should be permanent
    // Permanent if explicitly set, or if not in PR context (branch/tag push)
    let permanent = false;
    if (permanentInput) {
      permanent = permanentInput.toLowerCase() === "true";
    } else {
      // Default: permanent for branch/tag pushes, temporary for PRs
      permanent = !github.context.payload.pull_request;
    }

    core.info(`Project: ${project}`);
    core.info(`Snapshot name: ${snapshotName}`);
    core.info(`Permanent snapshot: ${permanent}`);

    core.info(`Reading schema from: ${schemaFile}`);

    // Read the JSON schema file
    const schemaContent = await readFile(schemaFile, "utf-8");
    const schema = JSON.parse(schemaContent);

    core.info(`Sending schema to API: ${apiUrl}`);

    // Get base branch name if in PR context
    const baseBranchName = github.context.payload.pull_request?.base?.ref;

    // Send schema to API
    const response = await sendSchemaToApi({
      apiUrl,
      schema,
      authToken,
      oidcToken,
      project,
      snapshotName,
      permanent,
      baseBranchName,
    });

    core.info(`API response received: ${JSON.stringify(response)}`);

    // Set outputs
    core.setOutput("response", JSON.stringify(response));
    if (response.snapshot?.id && project) {
      // Generate snapshot URL from response data
      const snapshotUrl = `https://explore-openapi.dev/view?project=${project}&snapshot=${response.snapshot.name}`;
      core.setOutput("snapshot-url", snapshotUrl);
    }

    // Add snapshot info to workflow summary for easy access
    if (github.context.payload.pull_request) {
      await addWorkflowSummary(response, project);
      core.info(
        "Snapshot information added to workflow summary. PR comment will be posted by the backend via GitHub App.",
      );
    }

    core.info("Action completed successfully!");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    core.setFailed(`Action failed: ${errorMessage}`);

    // Note: Error handling and PR comments are managed by the backend
    core.error(`Snapshot creation failed: ${errorMessage}`);
  }
}

run();
