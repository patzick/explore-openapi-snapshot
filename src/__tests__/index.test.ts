import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { sendSchemaToApi } from "../api.js";
import { createOrUpdateComment } from "../comment.js";

// Mock all dependencies
vi.mock("@actions/core");
vi.mock("@actions/github");
vi.mock("../api.js");
vi.mock("../comment.js");
vi.mock("fs/promises", () => ({
  readFile: vi
    .fn()
    .mockResolvedValue(
      '{"openapi": "3.0.0", "info": {"title": "Test API", "version": "1.0.0"}}',
    ),
}));

describe("Main Action Logic", () => {
  const mockCore = core as any;
  const mockGithub = github as any;
  const mockSendSchemaToApi = sendSchemaToApi as Mock<typeof sendSchemaToApi>;
  const mockCreateOrUpdateComment = createOrUpdateComment as Mock<typeof createOrUpdateComment>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "schema-file": "./test-schema.json",
        project: "test-project",
        "auth-token": "test-token",
        "github-token": "test-github-token",
      };
      return inputs[name] || "";
    });

    mockCore.info = vi.fn();
    mockCore.setOutput = vi.fn();
    mockCore.setFailed = vi.fn();
    mockCore.warning = vi.fn();

    mockSendSchemaToApi.mockResolvedValue({
      id: "snapshot-123",
      projectId: "project-456",
      name: "test-snapshot",
      status: "available",
      hash: "abc123",
      size: 1024,
      active: true,
      createdAt: "2023-01-01T00:00:00Z",
      modifiedAt: "2023-01-01T00:00:00Z",
      description: null,
      expiredAt: null,
      reason: null,
    });

    mockCreateOrUpdateComment.mockResolvedValue(undefined);

    mockGithub.getOctokit = vi.fn().mockReturnValue({
      rest: {
        issues: {
          listComments: vi.fn().mockResolvedValue({ data: [] }),
          createComment: vi.fn().mockResolvedValue({}),
        },
      },
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should set permanent to false for PR context", async () => {
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

    expect(mockSendSchemaToApi).toHaveBeenCalledWith(
      "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      expect.any(Object),
      "test-token",
      "test-project",
      "123",
      false, // permanent should be false for PR
    );
  });

  it("should set permanent to true for branch push context", async () => {
    // Mock branch push context
    mockGithub.context = {
      repo: { owner: "test-owner", repo: "test-repo" },
      ref: "refs/heads/main",
      payload: {
        // No pull_request field
      },
    };

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSendSchemaToApi).toHaveBeenCalledWith(
      "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      expect.any(Object),
      "test-token",
      "test-project",
      "main",
      true, // permanent should be true for branch push
    );
  });

  it("should set permanent to true for tag push context", async () => {
    // Mock tag push context
    mockGithub.context = {
      repo: { owner: "test-owner", repo: "test-repo" },
      ref: "refs/tags/v1.0.0",
      payload: {
        // No pull_request field
      },
    };

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSendSchemaToApi).toHaveBeenCalledWith(
      "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      expect.any(Object),
      "test-token",
      "test-project",
      "v1.0.0",
      true, // permanent should be true for tag push
    );
  });

  it("should override permanent flag when explicitly set to true", async () => {
    // Mock PR context but with permanent input set to true
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

    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "schema-file": "./test-schema.json",
        project: "test-project",
        "auth-token": "test-token",
        "github-token": "test-github-token",
        permanent: "true", // Override to true
      };
      return inputs[name] || "";
    });

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSendSchemaToApi).toHaveBeenCalledWith(
      "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      expect.any(Object),
      "test-token",
      "test-project",
      "123",
      true, // permanent should be true due to explicit override
    );
  });

  it("should override permanent flag when explicitly set to false", async () => {
    // Mock branch context but with permanent input set to false
    mockGithub.context = {
      repo: { owner: "test-owner", repo: "test-repo" },
      ref: "refs/heads/feature-branch",
      payload: {
        // No pull_request field
      },
    };

    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "schema-file": "./test-schema.json",
        project: "test-project",
        "auth-token": "test-token",
        "github-token": "test-github-token",
        permanent: "false", // Override to false
      };
      return inputs[name] || "";
    });

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSendSchemaToApi).toHaveBeenCalledWith(
      "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      expect.any(Object),
      "test-token",
      "test-project",
      "feature-branch",
      false, // permanent should be false due to explicit override
    );
  });
});
