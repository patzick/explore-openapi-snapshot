import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "node:fs/promises";
import { sendSchemaToApi } from "./api.js";
import { createOrUpdateComment } from "./comment.js";

async function run(): Promise<void> {
  try {
    // Get inputs
    const schemaFile = core.getInput("schema-file", { required: true });
    const project = core.getInput("project", { required: true });
    const snapshotNameInput = core.getInput("snapshot-name");
    const authToken = core.getInput("auth-token", { required: true });
    const githubToken = core.getInput("github-token", { required: true });
    const permanentInput = core.getInput("permanent");

    const apiUrl = "https://editor-api.explore-openapi.dev/public/v1/snapshot";

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

    // Send schema to API
    const response = await sendSchemaToApi({
      apiUrl,
      schema,
      authToken,
      project,
      snapshotName,
      permanent,
    });

    core.info(`API response received: ${JSON.stringify(response)}`);

    // Set outputs
    core.setOutput("response", JSON.stringify(response));
    if (response.snapshot?.id && project) {
      // Generate snapshot URL from response data
      const snapshotUrl = `https://explore-openapi.dev/view?project=${project}&snapshot=${response.snapshot.name}`;
      core.setOutput("snapshot-url", snapshotUrl);
    }

    // Create or update PR comment if in PR context
    if (github.context.payload.pull_request) {
      const octokit = github.getOctokit(githubToken);
      await createOrUpdateComment(octokit, response, project);
      core.info("PR comment created/updated successfully");
    } else {
      core.warning("Not in a pull request context, skipping comment creation");
    }

    core.info("Action completed successfully!");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    core.setFailed(`Action failed: ${errorMessage}`);

    // Create error comment in PR if possible
    if (github.context.payload.pull_request) {
      try {
        const githubToken = core.getInput("github-token", { required: true });
        const project = core.getInput("project", { required: true });
        const octokit = github.getOctokit(githubToken);
        await createOrUpdateComment(
          octokit,
          {
            snapshot: null,
            sameAsHead: false,
            message: null,
            error: errorMessage,
          },
          project,
        );
        core.info("Error comment created in PR");
      } catch (commentError) {
        core.warning(
          `Failed to create error comment: ${commentError instanceof Error ? commentError.message : "Unknown error"}`,
        );
      }
    }
  }
}

run();
