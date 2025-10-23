import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sendSchemaToApi } from "../api.js";
import z from "zod";
import { SnapshotReturnSchema } from "../types.js";

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

  it("should successfully send schema to API and receive valid response", async () => {
    const response = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema,
      authToken: envVars.API_AUTH_TOKEN,
      project: envVars.TEST_PROJECT,
      snapshotName: envVars.TEST_SNAPSHOT_NAME,
      permanent: true,
    });

    // Verify response has expected structure (without snapshotting dynamic values)
    const safeParse = SnapshotReturnSchema.safeParse(response);
    if (!safeParse.success) {
      console.error("Invalid response:", z.prettifyError(safeParse.error));
    }
    expect(safeParse.success).toBe(true);
  }, 30000); // 30 second timeout for API call

  it("should detect sameAsBase when PR snapshot matches base snapshot", async () => {
    // First, create base snapshot
    const baseSnapshotName = "my-e2e-snapshot";
    const baseResponse = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema,
      authToken: envVars.API_AUTH_TOKEN,
      project: envVars.TEST_PROJECT,
      snapshotName: baseSnapshotName,
      permanent: true,
    });

    // Verify base snapshot was created successfully
    expect(baseResponse.snapshot).toBeDefined();
    expect(baseResponse.snapshot?.name).toBe(baseSnapshotName);

    // Then, send PR snapshot request with the same schema
    const prSnapshotName = "my-e2e-snapshot-pr";
    const prResponse = await sendSchemaToApi({
      apiUrl: envVars.API_URL,
      schema: testSchema, // Same schema as base
      authToken: envVars.API_AUTH_TOKEN,
      project: envVars.TEST_PROJECT,
      snapshotName: prSnapshotName,
      permanent: false,
      baseBranchName: baseSnapshotName, // Reference the base snapshot
    });

    // Verify sameAsBase flag is true
    expect(prResponse.sameAsBase).toBe(true);

    // Verify that the old (base) snapshot was returned, not a new one created
    expect(prResponse.snapshot).toBeDefined();
    expect(prResponse.snapshot?.name).toBe(baseSnapshotName); // Should return base snapshot name
    expect(prResponse.snapshot?.id).toBe(baseResponse.snapshot?.id); // Should be the same snapshot ID
    expect(prResponse.snapshot?.hash).toBe(baseResponse.snapshot?.hash); // Should have the same hash
  }, 5000); // 5 second timeout for two API calls
});
