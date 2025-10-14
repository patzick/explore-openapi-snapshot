import * as github from "@actions/github";
import type { SnapshotReturn } from "./types";

type GitHub = ReturnType<typeof github.getOctokit>;

const COMMENT_IDENTIFIER = "<!-- openapi-snapshot-comment -->";

export async function createOrUpdateComment(
  octokit: GitHub,
  response: SnapshotReturn,
  project: string,
): Promise<void> {
  const { context } = github;
  const { owner, repo } = context.repo;
  const issue_number = context.payload.pull_request?.number;

  if (!issue_number || issue_number <= 0) {
    throw new Error("No pull request number found");
  }

  // Create comment body
  const commentBody = formatComment(response, project);

  // Find existing comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
  });

  const existingComment = comments.find((comment) =>
    comment.body?.includes(COMMENT_IDENTIFIER),
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

function formatComment(response: SnapshotReturn, project: string): string {
  const lines = [COMMENT_IDENTIFIER, "## 📸 OpenAPI Snapshot", ""];

  // Check if this is an error response
  if (!response.snapshot) {
    lines.push("❌ Failed to create snapshot");
    if (response.error) {
      lines.push("");
      lines.push(`**Error:** ${response.error}`);
    }
    return lines.join("\n");
  }

  // Handle successful API response
  const apiResponse = response;

  // Check if schema is same as base branch
  if (apiResponse.sameAsBase) {
    const { context } = github;
    const baseBranch = context.payload.pull_request?.base?.ref || "base branch";

    lines.push(`ℹ️ No changes detected compared to ${baseBranch}`);
    lines.push("");
    lines.push(
      `🔗 **Base Branch Snapshot:** https://explore-openapi.dev/view?project=${project}&snapshot=${baseBranch}`,
    );
  } else {
    lines.push("✅ Successfully created snapshot!");

    // Generate compare URL if in PR context (first)
    const { context } = github;
    const prNumber = context.payload.pull_request?.number;
    const baseBranch = context.payload.pull_request?.base?.ref;

    if (project && prNumber && baseBranch) {
      lines.push("");
      lines.push(
        `🔄 **Compare URL:** https://explore-openapi.dev/compare?project=${project}&baseSnapshot=${baseBranch}&featureSnapshot=${prNumber}`,
      );
    }

    // Generate snapshot URL (second)
    if (apiResponse.snapshot?.id && project) {
      lines.push("");
      lines.push(
        `🔗 **Snapshot URL:** https://explore-openapi.dev/view?project=${project}&snapshot=${apiResponse.snapshot.name}`,
      );
    }
  }

  // Add any additional message
  if (apiResponse.message) {
    lines.push("");
    lines.push(`📝 ${apiResponse.message}`);
  }

  return lines.join("\n");
}
