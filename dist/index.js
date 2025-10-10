import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "fs/promises";

//#region src/api.ts
async function sendSchemaToApi(apiUrl, schema, authToken, project, snapshotName) {
	try {
		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${authToken}`
			},
			body: JSON.stringify({
				schema,
				project,
				name: snapshotName
			})
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed with status ${response.status}: ${errorText}`);
		}
		return await response.json();
	} catch (error) {
		if (error instanceof Error) core.error(`Failed to send schema to API: ${error.message}`);
		throw error;
	}
}

//#endregion
//#region src/comment.ts
const COMMENT_IDENTIFIER = "<!-- openapi-snapshot-comment -->";
async function createOrUpdateComment(octokit, response) {
	const { context } = github;
	const { owner, repo } = context.repo;
	const issue_number = context.payload.pull_request?.number;
	if (!issue_number || issue_number <= 0) throw new Error("No pull request number found");
	const commentBody = formatComment(response);
	const { data: comments } = await octokit.rest.issues.listComments({
		owner,
		repo,
		issue_number
	});
	const existingComment = comments.find((comment) => comment.body?.includes(COMMENT_IDENTIFIER));
	if (existingComment) await octokit.rest.issues.updateComment({
		owner,
		repo,
		comment_id: existingComment.id,
		body: commentBody
	});
	else await octokit.rest.issues.createComment({
		owner,
		repo,
		issue_number,
		body: commentBody
	});
}
function formatComment(response) {
	const lines = [
		COMMENT_IDENTIFIER,
		"## 📸 OpenAPI Snapshot Created",
		""
	];
	if ("success" in response && response.success === false) {
		lines.push("❌ Failed to create snapshot");
		if (response.message) {
			lines.push("");
			lines.push(`**Error:** ${response.message}`);
		}
		return lines.join("\n");
	}
	const apiResponse = response;
	lines.push("✅ Successfully created snapshot!");
	if (apiResponse.id && apiResponse.projectId) {
		lines.push("");
		lines.push(`🔗 **Snapshot URL:** https://explore-openapi.dev/view?projectId=${apiResponse.projectId}&snapshotId=${apiResponse.id}`);
	}
	const { context } = github;
	const prNumber = context.payload.pull_request?.number;
	const baseBranch = context.payload.pull_request?.base?.ref;
	if (apiResponse.projectId && prNumber && baseBranch) {
		lines.push("");
		lines.push(`🔄 **Compare URL:** https://explore-openapi.dev/compare/${apiResponse.projectId}/from/${baseBranch}/to/${prNumber}`);
	}
	if (apiResponse.message) {
		lines.push("");
		lines.push(`📝 ${apiResponse.message}`);
	}
	return lines.join("\n");
}

//#endregion
//#region src/index.ts
async function run() {
	try {
		const schemaFile = core.getInput("schema-file", { required: true });
		const project = core.getInput("project", { required: true });
		const snapshotNameInput = core.getInput("snapshot-name");
		const authToken = core.getInput("auth-token", { required: true });
		const githubToken = core.getInput("github-token", { required: true });
		const apiUrl = "https://editor-api.explore-openapi.dev/public/v1/snapshot";
		let snapshotName = snapshotNameInput;
		if (!snapshotName) if (github.context.payload.pull_request) snapshotName = `${github.context.payload.pull_request.number}`;
		else snapshotName = github.context.ref.replace("refs/heads/", "");
		core.info(`Project: ${project}`);
		core.info(`Snapshot name: ${snapshotName}`);
		core.info(`Reading schema from: ${schemaFile}`);
		const schemaContent = await readFile(schemaFile, "utf-8");
		const schema = JSON.parse(schemaContent);
		core.info(`Sending schema to API: ${apiUrl}`);
		const response = await sendSchemaToApi(apiUrl, schema, authToken, project, snapshotName);
		core.info(`API response received: ${JSON.stringify(response)}`);
		core.setOutput("response", JSON.stringify(response));
		if (response.id && response.projectId) {
			const snapshotUrl = `https://explore-openapi.dev/view?projectId=${response.projectId}&snapshotId=${response.id}`;
			core.setOutput("snapshot-url", snapshotUrl);
		}
		if (github.context.payload.pull_request) {
			await createOrUpdateComment(github.getOctokit(githubToken), response);
			core.info("PR comment created/updated successfully");
		} else core.warning("Not in a pull request context, skipping comment creation");
		core.info("Action completed successfully!");
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
		core.setFailed(`Action failed: ${errorMessage}`);
		if (github.context.payload.pull_request) try {
			const githubToken = core.getInput("github-token", { required: true });
			await createOrUpdateComment(github.getOctokit(githubToken), {
				success: false,
				message: errorMessage
			});
			core.info("Error comment created in PR");
		} catch (commentError) {
			core.warning(`Failed to create error comment: ${commentError instanceof Error ? commentError.message : "Unknown error"}`);
		}
	}
}
run();

//#endregion
export {  };