import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
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
  const mockCreateOrUpdateComment = createOrUpdateComment as Mock<
    typeof createOrUpdateComment
  >;

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
      snapshot: {
        id: "snapshot-123",
        projectId: "project-456",
        name: "test-snapshot",
        status: "available" as const,
        hash: "abc123",
        size: 1024,
        description: null,
        expiredAt: null,
        reason: null,
        createdAt: "2023-01-01T00:00:00Z",
        modifiedAt: "2023-01-01T00:00:00Z",
      },
      sameAsBase: false,
      message: null,
      error: null,
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

    expect(mockSendSchemaToApi).toHaveBeenCalledWith({
      apiUrl: "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      schema: expect.any(Object),
      authToken: "test-token",
      project: "test-project",
      snapshotName: "123",
      permanent: false, // permanent should be false for PR
      baseBranchName: "main",
    });
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

    expect(mockSendSchemaToApi).toHaveBeenCalledWith({
      apiUrl: "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      schema: expect.any(Object),
      authToken: "test-token",
      project: "test-project",
      snapshotName: "main",
      permanent: true, // permanent should be true for branch push
      baseBranchName: undefined,
    });
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

    expect(mockSendSchemaToApi).toHaveBeenCalledWith({
      apiUrl: "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      schema: expect.any(Object),
      authToken: "test-token",
      project: "test-project",
      snapshotName: "v1.0.0",
      permanent: true, // permanent should be true for tag push
      baseBranchName: undefined,
    });
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

    expect(mockSendSchemaToApi).toHaveBeenCalledWith({
      apiUrl: "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      schema: expect.any(Object),
      authToken: "test-token",
      project: "test-project",
      snapshotName: "123",
      permanent: true, // permanent should be true due to explicit override
      baseBranchName: "main",
    });
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

    expect(mockSendSchemaToApi).toHaveBeenCalledWith({
      apiUrl: "https://editor-api.explore-openapi.dev/public/v1/snapshot",
      schema: expect.any(Object),
      authToken: "test-token",
      project: "test-project",
      snapshotName: "feature-branch",
      permanent: false, // permanent should be false due to explicit override
      baseBranchName: undefined,
    });
  });

  it("should fail when auth-token is missing (legacy mode)", async () => {
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

    // Mock missing auth-token (and not using OIDC)
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "schema-file": "./test-schema.json",
        project: "test-project",
        "auth-token": "", // Missing auth-token
        "use-oidc": "false", // Not using OIDC
      };
      return inputs[name] || "";
    });

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not call sendSchemaToApi
    expect(mockSendSchemaToApi).not.toHaveBeenCalled();

    // Should fail the action with appropriate message
    expect(mockCore.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("No authentication token provided"),
    );
  });

  it("should fail when auth-token is missing outside PR context (legacy mode)", async () => {
    // Mock branch push context (not a PR)
    mockGithub.context = {
      repo: { owner: "test-owner", repo: "test-repo" },
      ref: "refs/heads/main",
      payload: {
        // No pull_request field
      },
    };

    // Mock missing auth-token
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "schema-file": "./test-schema.json",
        project: "test-project",
        "auth-token": "", // Missing auth-token
        "use-oidc": "false", // Not using OIDC
      };
      return inputs[name] || "";
    });

    // Import and run the action
    await import("../index.js");

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not call sendSchemaToApi
    expect(mockSendSchemaToApi).not.toHaveBeenCalled();

    // Should fail the action
    expect(mockCore.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("No authentication token provided"),
    );
  });
});
