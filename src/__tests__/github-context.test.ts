import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOrUpdateComment } from "../comment.js";
import * as github from "@actions/github";

// Mock @actions/github
vi.mock("@actions/github", () => ({
  context: {
    repo: {
      owner: "test-owner",
      repo: "test-repo",
    },
    payload: {
      pull_request: {
        number: 123,
      },
    },
  },
  getOctokit: vi.fn(),
}));

// Helper function to create mock API responses
function createMockApiResponse(overrides: Partial<any> = {}) {
  return {
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
    ...overrides,
  };
}

describe("GitHub Context Scenarios", () => {
  let mockOctokit: any;
  let originalContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalContext = { ...github.context };

    mockOctokit = {
      rest: {
        issues: {
          listComments: vi.fn(),
          createComment: vi.fn(),
          updateComment: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    // Restore original context
    (github as any).context = originalContext;
  });

  it("should handle missing pull request in payload", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {},
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should handle null pull request in payload", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {
        pull_request: null,
      },
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should handle pull request without number", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {
        pull_request: {
          // Missing number field
          title: "Test PR",
        },
      },
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should handle different repository contexts", async () => {
    (github as any).context = {
      ...originalContext,
      repo: {
        owner: "different-owner",
        repo: "different-repo",
      },
      payload: {
        pull_request: {
          number: 456,
        },
      },
    };

    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(
      mockOctokit,
      createMockApiResponse({
        message: "Test in different repo",
      }),
      "test-project",
    );

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "different-owner",
      repo: "different-repo",
      issue_number: 456,
      body: expect.stringContaining("Test in different repo"),
    });
  });

  it("should handle issue context (not PR)", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {
        issue: {
          number: 789,
        },
        // No pull_request field
      },
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should handle push context (not PR)", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {
        ref: "refs/heads/main",
        commits: [{ id: "abc123" }],
        // No pull_request field
      },
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should handle workflow_dispatch context (not PR)", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {
        inputs: {
          some_input: "value",
        },
        // No pull_request field
      },
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should work with valid PR context from different event types", async () => {
    // Test pull_request_target event
    (github as any).context = {
      ...originalContext,
      eventName: "pull_request_target",
      payload: {
        pull_request: {
          number: 999,
          head: {
            sha: "def456",
          },
        },
      },
    };

    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(
      mockOctokit,
      createMockApiResponse({
        message: "PR target event test",
      }),
      "test-project",
    );

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      issue_number: 999,
      body: expect.stringContaining("PR target event test"),
    });
  });

  it("should handle PR with zero number (edge case)", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {
        pull_request: {
          number: 0, // Edge case: PR number 0
        },
      },
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should handle PR with negative number (edge case)", async () => {
    (github as any).context = {
      ...originalContext,
      payload: {
        pull_request: {
          number: -1, // Edge case: negative PR number
        },
      },
    };

    await expect(
      createOrUpdateComment(
        mockOctokit,
        createMockApiResponse(),
        "test-project",
      ),
    ).rejects.toThrow("No pull request number found");
  });

  it("should handle missing repo context", async () => {
    (github as any).context = {
      ...originalContext,
      repo: {
        // Missing owner and repo
      },
      payload: {
        pull_request: {
          number: 123,
        },
      },
    };

    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(
      mockOctokit,
      createMockApiResponse(),
      "test-project",
    );

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: undefined,
      repo: undefined,
      issue_number: 123,
      body: expect.any(String),
    });
  });

  it("should handle empty repo context", async () => {
    (github as any).context = {
      ...originalContext,
      repo: {
        owner: "",
        repo: "",
      },
      payload: {
        pull_request: {
          number: 123,
        },
      },
    };

    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(
      mockOctokit,
      createMockApiResponse(),
      "test-project",
    );

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "",
      repo: "",
      issue_number: 123,
      body: expect.any(String),
    });
  });
});
