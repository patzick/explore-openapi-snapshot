import * as core from "@actions/core";
import * as github from "@actions/github";
import { readFile } from "fs/promises";

//#region src/api.ts
async function sendSchemaToApi(apiUrl, schema, authToken) {
	try {
		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${authToken}`
			},
			body: JSON.stringify(schema)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed with status ${response.status}: ${errorText}`);
		}
		const data = await response.json();
		return data;
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
	if (!issue_number) throw new Error("No pull request number found");
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
	if (response.success) {
		lines.push("✅ Successfully created snapshot!");
		if (response.snapshotUrl) {
			lines.push("");
			lines.push(`🔗 **Snapshot URL:** ${response.snapshotUrl}`);
		}
		if (response.message) {
			lines.push("");
			lines.push(`📝 ${response.message}`);
		}
	} else {
		lines.push("❌ Failed to create snapshot");
		if (response.message) {
			lines.push("");
			lines.push(`**Error:** ${response.message}`);
		}
	}
	return lines.join("\n");
}

//#endregion
//#region src/index.ts
async function run() {
	try {
		const schemaFile = core.getInput("schema-file", { required: true });
		const apiUrl = core.getInput("api-url", { required: true });
		const authToken = core.getInput("auth-token", { required: true });
		const githubToken = core.getInput("github-token", { required: true });
		core.info(`Reading schema from: ${schemaFile}`);
		const schemaContent = await readFile(schemaFile, "utf-8");
		const schema = JSON.parse(schemaContent);
		core.info(`Sending schema to API: ${apiUrl}`);
		const response = await sendSchemaToApi(apiUrl, schema, authToken);
		core.info(`API response received: ${JSON.stringify(response)}`);
		core.setOutput("response", JSON.stringify(response));
		if (response.snapshotUrl) core.setOutput("snapshot-url", response.snapshotUrl);
		if (github.context.payload.pull_request) {
			const octokit = github.getOctokit(githubToken);
			await createOrUpdateComment(octokit, response);
			core.info("PR comment created/updated successfully");
		} else core.warning("Not in a pull request context, skipping comment creation");
		core.info("Action completed successfully!");
	} catch (error) {
		if (error instanceof Error) core.setFailed(`Action failed: ${error.message}`);
		else core.setFailed("Action failed with unknown error");
	}
}
run();

//#endregion