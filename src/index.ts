import * as core from '@actions/core';
import * as github from '@actions/github';
import { readFile } from 'fs/promises';
import { sendSchemaToApi } from './api.js';
import { createOrUpdateComment } from './comment.js';

async function run(): Promise<void> {
  try {
    // Get inputs
    const schemaFile = core.getInput('schema-file', { required: true });
    const apiUrl = core.getInput('api-url', { required: true });
    const authToken = core.getInput('auth-token', { required: true });
    const githubToken = core.getInput('github-token', { required: true });

    core.info(`Reading schema from: ${schemaFile}`);
    
    // Read the JSON schema file
    const schemaContent = await readFile(schemaFile, 'utf-8');
    const schema = JSON.parse(schemaContent);

    core.info(`Sending schema to API: ${apiUrl}`);
    
    // Send schema to API
    const response = await sendSchemaToApi(apiUrl, schema, authToken);
    
    core.info(`API response received: ${JSON.stringify(response)}`);

    // Set outputs
    core.setOutput('response', JSON.stringify(response));
    if (response.snapshotUrl) {
      core.setOutput('snapshot-url', response.snapshotUrl);
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
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
    } else {
      core.setFailed('Action failed with unknown error');
    }
  }
}

run();
