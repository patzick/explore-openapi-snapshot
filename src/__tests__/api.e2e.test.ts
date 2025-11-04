import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sendSchemaToApi } from "../api.js";
import z from "zod";
import { SnapshotReturnSchema } from "../types.js";
import { createMockGitHubOidcToken } from "./mockJwt.js";

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envContent = readFileSync(".env", "utf-8");
    const envVars: Record<string, string> = {};

    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join("=").trim();
        }
      }
    });

    return envVars;
  } catch (error) {
    throw new Error(
      "Failed to load .env file. Make sure it exists and contains required variables. Error: " +
      error,
    );
  }
}

describe("E2E Tests", () => {
  const envVars = loadEnvFile();

  const requiredVars = [
    "API_URL",
    "API_AUTH_TOKEN",
    "TEST_PROJECT",
    "TEST_SNAPSHOT_NAME",
  ];

  // Check if all required environment variables are present
  requiredVars.forEach((varName) => {
    if (!envVars[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });

  const testSchema = {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
      description: "E2E test schema for explore-openapi-snapshot",
    },
    paths: {
      "/test": {
        get: {
          summary: "Test endpoint",
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "Hello World",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  it.skip("should successfully send schema to API and receive valid response", async () => {
    const mockOidcToken = createMockGitHubOidcToken(
      {},
      {
        owner: envVars.TEST_REPO?.split("/")[0] || "testowner",
        repo: envVars.TEST_REPO?.split("/")[1] || "testrepo",
        eventType: "push",
      },
    );

    const response = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema,
      oidcToken: mockOidcToken,
      project: envVars.TEST_PROJECT,
      snapshotName: envVars.TEST_SNAPSHOT_NAME,
    });

    // Verify response has expected structure (without snapshotting dynamic values)
    const safeParse = SnapshotReturnSchema.safeParse(response);
    if (!safeParse.success) {
      expect(z.prettifyError(safeParse.error)).toEqual("");
    }
    expect(safeParse.success).toBe(true);
  }, 5000); // 5 second timeout for API call

  it.skip("should detect sameAsBase when PR snapshot matches base snapshot", async () => {
    const mockOidcToken = createMockGitHubOidcToken(
      {
        base_ref: "main",
      },
      {
        owner: envVars.TEST_REPO?.split("/")[0] || "testowner",
        repo: envVars.TEST_REPO?.split("/")[1] || "testrepo",
        eventType: "push",
      },
    );

    // First, create base snapshot
    const _baseResponse = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema,
      oidcToken: mockOidcToken,
      project: envVars.TEST_PROJECT,
    });

    const parsedBaseResponse = SnapshotReturnSchema.safeParse(_baseResponse);

    const errorMessage = parsedBaseResponse.success
      ? undefined
      : z.prettifyError(parsedBaseResponse.error);
    expect(errorMessage).toBeUndefined();

    if (!parsedBaseResponse.success) {
      throw new Error(errorMessage);
    }

    // Verify base snapshot was created successfully
    expect(parsedBaseResponse.data.id).toBeDefined();
    // expect(baseResponse.snapshot?.name).toBe(baseSnapshotName);

    const prMockOidcToken = createMockGitHubOidcToken(
      {
        base_ref: "main",
        ref: "refs/pull/10/merge",
      },
      {
        owner: envVars.TEST_REPO?.split("/")[0] || "testowner",
        repo: envVars.TEST_REPO?.split("/")[1] || "testrepo",
        eventType: "pr",
      },
    );

    // Then, send PR snapshot request with the same schema
    const _prResponse = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema, // Same schema as base
      oidcToken: prMockOidcToken,
      project: envVars.TEST_PROJECT,
    });

    const parsedPrResponse = SnapshotReturnSchema.safeParse(_prResponse);
    const prErrorMessage = parsedPrResponse.success
      ? undefined
      : z.prettifyError(parsedPrResponse.error);
    expect(prErrorMessage).toBeUndefined();

    if (!parsedPrResponse.success) {
      throw new Error(prErrorMessage);
    }

    // Verify sameAsBase flag is true
    expect(parsedPrResponse.data.sameAsBase).toBe(true);

    // Verify that the old (base) snapshot was returned, not a new one created
    expect(parsedPrResponse.data.id).toBeDefined();
    expect(parsedPrResponse.data.id).toBe(parsedBaseResponse.data.id); // Should be the same snapshot ID
  }, 5000); // 5 second timeout for two API calls

  it.skip("should successfully send schema with push event to main branch", async () => {
    // Create a mock OIDC token for a push event to main branch
    const mockOidcToken = createMockGitHubOidcToken(
      {
        actor: "testuser",
        actor_id: "12345678",
        ref: "refs/heads/main",
        ref_protected: "true",
        ref_type: "branch",
        event_name: "push",
        head_ref: "",
        base_ref: "",
        workflow: "Test OpenAPI Snapshot Action",
        repository_visibility: "public",
        runner_environment: "github-hosted",
      },
      {
        owner: envVars.TEST_REPO?.split("/")[0] || "testowner",
        repo: envVars.TEST_REPO?.split("/")[1] || "testrepo",
        eventType: "push",
      },
    );

    const response = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema,
      oidcToken: mockOidcToken,
      project: envVars.TEST_PROJECT,
    });

    // Verify response has expected structure
    const safeParse = SnapshotReturnSchema.safeParse(response);
    if (!safeParse.success) {
      expect(z.prettifyError(safeParse.error)).toEqual("");
    }
    expect(safeParse.success).toBe(true);

    if (safeParse.success) {
      // Verify the snapshot was created/updated successfully
      expect(safeParse.data.id).toBeDefined();
      expect(safeParse.data.url).toMatchInlineSnapshot(
        `"https://explore-openapi.dev/view?project=${envVars.TEST_PROJECT}&snapshot=main"`,
      );
      // For push events to main, sameAsBase could be true or false depending on whether schema changed
      expect(typeof safeParse.data.sameAsBase).toBe("boolean");
    }
  }, 5000); // 5 second timeout for API call

  it("should successfully send schema with fork context (no OIDC token)", async () => {
    // Simulate a fork PR scenario where OIDC token is not available
    // Instead, we send fork context in the request body
    const response = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema,
      project: envVars.TEST_PROJECT,
      forkContext: {
        targetRepository: envVars.TEST_REPO || "testowner/testrepo",
        targetPullRequest: 8,
        commitSha: "b4dbd1cfd96039d6e5cabdb9f52e80f406bc7b20",
      },
    });

    // Verify response has expected structure
    const safeParse = SnapshotReturnSchema.safeParse(response);
    if (!safeParse.success) {
      expect(z.prettifyError(safeParse.error)).toEqual("");
    }
    expect(safeParse.success).toBe(true);

    if (safeParse.success) {
      // Verify the snapshot was created/updated successfully
      expect(safeParse.data.id).toBeDefined();
      expect(safeParse.data.url).toBeDefined();
      // Fork PRs should still get valid responses
      expect(typeof safeParse.data.sameAsBase).toBe("boolean");
    }
  }, 5000); // 5 second timeout for API call
});
