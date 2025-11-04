import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "node:fs/promises";
import { sendSchemaToApi } from "./api.js";
import { getOidcToken } from "./oidc.js";

async function run(): Promise<void> {
  try {
    // Get inputs
    const schemaFile = core.getInput("schema-file", { required: true });
    const project = core.getInput("project", { required: true });
    const snapshotNameInput = core.getInput("snapshot-name");

    const apiUrl = "https://action.api.explore-openapi.dev/v1/snapshot";

    // Detect if we're in a fork context
    const isFork =
      github.context.payload.pull_request?.head?.repo?.fork === true;

    let oidcToken: string | undefined;

    if (isFork) {
      core.info("Fork PR detected - using fork context mode");
    } else {
      // Get OIDC token for authentication
      core.info("Using OIDC authentication");
      try {
        core.info("Requesting OIDC token from GitHub Actions...");
        oidcToken = await getOidcToken("https://explore-openapi.dev");
        core.info("OIDC token obtained successfully");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        core.setFailed(
          `Failed to obtain OIDC token: ${errorMessage}. Make sure the workflow has 'id-token: write' permission.`,
        );
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

    core.info(`Project: ${project}`);
    core.info(`Snapshot name: ${snapshotName}`);

    core.info(`Reading schema from: ${schemaFile}`);

    // Read the JSON schema file
    const schemaContent = await readFile(schemaFile, "utf-8");
    const schema = JSON.parse(schemaContent);

    core.info(`Sending schema to API: ${apiUrl}`);

    // Prepare fork context if in fork mode
    const forkContext = isFork
      ? {
        targetRepository:
          github.context.payload.pull_request?.base?.repo?.full_name,
        targetPullRequest: github.context.payload.pull_request?.number,
        commitSha:
          github.context.payload.pull_request?.head?.sha ||
          github.context.sha,
      }
      : undefined;

    if (forkContext) {
      core.info(`Fork context: ${JSON.stringify(forkContext)}`);
    }

    // Send schema to API
    const response = await sendSchemaToApi({
      apiUrl,
      schema,
      oidcToken,
      project,
      snapshotName,
      forkContext,
    });

    core.info(`API response received: ${JSON.stringify(response)}`);

    // Set outputs
    core.setOutput("response", JSON.stringify(response));
    if (response.url) {
      // Generate snapshot URL from response data
      core.setOutput("snapshot-url", response.url);
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
