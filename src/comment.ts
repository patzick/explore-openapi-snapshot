import * as github from '@actions/github';
import type { ApiResponse } from './api.js';

type GitHub = ReturnType<typeof github.getOctokit>;

const COMMENT_IDENTIFIER = '<!-- openapi-snapshot-comment -->';

export async function createOrUpdateComment(
  octokit: GitHub,
  response: ApiResponse
): Promise<void> {
  const { context } = github;
  const { owner, repo } = context.repo;
  const issue_number = context.payload.pull_request?.number;

  if (!issue_number) {
    throw new Error('No pull request number found');
  }

  // Create comment body
  const commentBody = formatComment(response);

  // Find existing comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
  });

  const existingComment = comments.find((comment) =>
    comment.body?.includes(COMMENT_IDENTIFIER)
  );

  if (existingComment) {
    // Update existing comment
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: commentBody,
    });
  } else {
    // Create new comment
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body: commentBody,
    });
  }
}

function formatComment(response: ApiResponse): string {
  const lines = [
    COMMENT_IDENTIFIER,
    '## 📸 OpenAPI Snapshot Created',
    '',
  ];

  if (response.success) {
    lines.push('✅ Successfully created snapshot!');
    if (response.snapshotUrl) {
      lines.push('');
      lines.push(`🔗 **Snapshot URL:** ${response.snapshotUrl}`);
    }
    if (response.message) {
      lines.push('');
      lines.push(`📝 ${response.message}`);
    }
  } else {
    lines.push('❌ Failed to create snapshot');
    if (response.message) {
      lines.push('');
      lines.push(`**Error:** ${response.message}`);
    }
  }

  return lines.join('\n');
}
