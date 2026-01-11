import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { sendSchemaToApi } from "../api.js";

// Mock all dependencies
vi.mock("@actions/core");
vi.mock("@actions/github");
vi.mock("../api.js");
vi.mock("fs/promises", () => ({
  readFile: vi
    .fn()
    .mockResolvedValue('{"openapi": "3.0.0", "info": {"title": "Test API", "version": "1.0.0"}}'),
}));

describe("Main Action Logic", () => {
  const mockCore = core as any;
  const mockGithub = github as any;
  const mockSendSchemaToApi = sendSchemaToApi as Mock<typeof sendSchemaToApi>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "schema-file": "./test-schema.json",
        project: "test-project",
      };
      return inputs[name] || "";
    });

    // Mock OIDC token
    vi.mock("../oidc.js", () => ({
      getOidcToken: vi.fn().mockResolvedValue("test-oidc-token"),
    }));

    mockCore.info = vi.fn();
    mockCore.setOutput = vi.fn();
    mockCore.setFailed = vi.fn();
    mockCore.warning = vi.fn();
    mockCore.error = vi.fn();

    mockSendSchemaToApi.mockResolvedValue({
      id: "snapshot-123",
      url: "https://explore-openapi.dev/view?project=test-project&snapshot=123",
      sameAsBase: false,
      message: null,
      error: null,
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should generate snapshot name from PR number", async () => {
    // Mock PR context
    mockGithub.context = {
      repo: { owner: "test-owner", repo: "test-repo" },
      ref: "refs/pull/123/merge",
      payload: {
        pull_request: {
          number: 123,
          base: { ref: "main" },
        },
      },
    };

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSendSchemaToApi).toHaveBeenCalledWith({
      apiUrl: "https://action.api.explore-openapi.dev/v1/snapshot",
      schema: expect.any(Object),
      oidcToken: "test-oidc-token",
      project: "test-project",
      snapshotName: "123",
    });
  });

  it("should generate snapshot name from branch name", async () => {
    // Mock branch push context
    mockGithub.context = {
      repo: { owner: "test-owner", repo: "test-repo" },
      ref: "refs/heads/main",
      payload: {},
    };

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSendSchemaToApi).toHaveBeenCalledWith({
      apiUrl: "https://action.api.explore-openapi.dev/v1/snapshot",
      schema: expect.any(Object),
      oidcToken: "test-oidc-token",
      project: "test-project",
      snapshotName: "main",
    });
  });
});
