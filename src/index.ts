import * as core from '@actions/core';
import * as github from '@actions/github';
import { readFile } from 'fs/promises';
import { sendSchemaToApi } from './api.js';
import { createOrUpdateComment } from './comment.js';

async function run(): Promise<void> {
  try {
    // Get inputs
    const schemaFile = core.getInput('schema-file', { required: true });
    const project = core.getInput('project', { required: true });
    const snapshotNameInput = core.getInput('snapshot-name');
    const authToken = core.getInput('auth-token', { required: true });
    const githubToken = core.getInput('github-token', { required: true });


    const apiUrl = 'https://editor-api.explore-openapi.dev/public/v1/snapshot';

    // Generate snapshot name: PR number if in PR context, otherwise branch name
    let snapshotName = snapshotNameInput;
    if (!snapshotName) {
      if (github.context.payload.pull_request) {
        snapshotName = `${github.context.payload.pull_request.number}`;
      } else {
        // Extract branch name from ref (refs/heads/branch-name -> branch-name)
        const ref = github.context.ref;
        snapshotName = ref.replace('refs/heads/', '');
      }
    }

    core.info(`Project: ${project}`);
    core.info(`Snapshot name: ${snapshotName}`);

    core.info(`Reading schema from: ${schemaFile}`);

    // Read the JSON schema file
    const schemaContent = await readFile(schemaFile, 'utf-8');
    const schema = JSON.parse(schemaContent);

    core.info(`Sending schema to API: ${apiUrl}`);

    // Send schema to API
    const response = await sendSchemaToApi(apiUrl, schema, authToken, project, snapshotName);

    core.info(`API response received: ${JSON.stringify(response)}`);

    // Set outputs
    core.setOutput('response', JSON.stringify(response));
    if (response.id && response.projectId) {
      // Generate snapshot URL from response data
      const snapshotUrl = `https://explore-openapi.dev/view?projectId=${response.projectId}&snapshotId=${response.id}`;
      core.setOutput('snapshot-url', snapshotUrl);
    }

    // Create or update PR comment if in PR context
    if (github.context.payload.pull_request) {
      const octokit = github.getOctokit(githubToken);
      await createOrUpdateComment(octokit, response);
      core.info('PR comment created/updated successfully');
    } else {
      core.warning('Not in a pull request context, skipping comment creation');
    }

    core.info('Action completed successfully!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    core.setFailed(`Action failed: ${errorMessage}`);

    // Create error comment in PR if possible
    if (github.context.payload.pull_request) {
      try {
        const githubToken = core.getInput('github-token', { required: true });
        const octokit = github.getOctokit(githubToken);
        await createOrUpdateComment(octokit, {
          success: false,
          message: errorMessage
        });
        core.info('Error comment created in PR');
      } catch (commentError) {
        core.warning(`Failed to create error comment: ${commentError instanceof Error ? commentError.message : 'Unknown error'}`);
      }
    }
  }
}

run();
