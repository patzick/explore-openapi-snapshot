import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendSchemaToApi } from "../api.js";
import { createOrUpdateComment } from "../comment.js";

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
        base: {
          ref: "main",
        },
      },
    },
  },
  getOctokit: vi.fn(),
}));

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("Integration Tests - API to PR Comment Flow", () => {
  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();

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

  it("should complete full flow: API success -> PR comment creation", async () => {
    // Mock successful API response
    const mockApiResponse = {
      snapshot: {
        id: "snapshot-abc123",
        projectId: "project-def456",
        name: "test-snapshot",
        status: "available" as const,
        hash: "hash123",
        size: 1024,
        description: null,
        expiredAt: null,
        reason: null,
        createdAt: "2023-01-01T00:00:00Z",
        modifiedAt: "2023-01-01T00:00:00Z",
      },
      sameAsBase: false,
      message: "Snapshot created successfully",
      error: null,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Mock no existing comments
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    // Step 1: Send schema to API
    const apiResult = await sendSchemaToApi({
      apiUrl: "https://api.example.com/snapshot",
      schema: {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
      },
      authToken: "test-token",
      project: "test-project",
      snapshotName: "test-snapshot",
      permanent: false,
    });

    expect(apiResult).toEqual(mockApiResponse);

    // Step 2: Create PR comment with API result
    await createOrUpdateComment(mockOctokit, apiResult, "test-project");

    // Verify comment was created with correct content
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      issue_number: 123,
      body: expect.stringContaining("✅ Successfully created snapshot!"),
    });

    const commentBody =
      mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(
      "https://explore-openapi.dev/view?project=test-project&snapshot=test-snapshot",
    );
    expect(commentBody).toContain(
      "https://explore-openapi.dev/compare/test-project/from/main/to/123",
    );
    expect(commentBody).toContain("Snapshot created successfully");
    expect(commentBody).toContain("<!-- openapi-snapshot-comment -->");
  });

  it("should complete full flow: API error -> PR comment with error", async () => {
    // Mock API error response
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    // Mock no existing comments
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    // Step 1: API call should throw error
    await expect(
      sendSchemaToApi({
        apiUrl: "https://api.example.com/snapshot",
        schema: { openapi: "3.0.0" },
        authToken: "invalid-token",
        project: "test-project",
        snapshotName: "test-snapshot",
        permanent: false,
      }),
    ).rejects.toThrow("API request failed with status 401");

    // Step 2: In a real scenario, the action would catch this error and create a comment
    const errorResponse = {
      snapshot: null,
      sameAsBase: false,
      message: null,
      error: "API request failed with status 401: Unauthorized",
    };

    await createOrUpdateComment(mockOctokit, errorResponse, "test-project");

    // Verify error comment was created
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      issue_number: 123,
      body: expect.stringContaining("❌ Failed to create snapshot"),
    });

    const commentBody =
      mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(
      "API request failed with status 401: Unauthorized",
    );
  });

  it("should update existing comment on subsequent runs", async () => {
    // Mock successful API response
    const mockApiResponse = {
      snapshot: {
        id: "snapshot-def456",
        projectId: "project-ghi789",
        name: "updated-snapshot",
        status: "available" as const,
        hash: "hash456",
        size: 2048,
        description: null,
        expiredAt: null,
        reason: null,
        createdAt: "2023-01-01T00:00:00Z",
        modifiedAt: "2023-01-01T01:00:00Z",
      },
      sameAsBase: false,
      message: "Snapshot updated successfully",
      error: null,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Mock existing comment
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [
        {
          id: 789,
          body: "<!-- openapi-snapshot-comment -->\n## 📸 OpenAPI Snapshot Created\n\n✅ Successfully created snapshot!\n\n🔗 **Snapshot URL:** https://explore-openapi.dev/snapshot/abc123",
        },
      ],
    });

    // Step 1: Send schema to API
    const apiResult = await sendSchemaToApi({
      apiUrl: "https://api.example.com/snapshot",
      schema: {
        openapi: "3.0.0",
        info: { title: "Updated API", version: "1.1.0" },
      },
      authToken: "test-token",
      project: "test-project",
      snapshotName: "test-snapshot",
      permanent: false,
    });

    // Step 2: Update existing PR comment
    await createOrUpdateComment(mockOctokit, apiResult, "test-project");

    // Verify comment was updated, not created
    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      comment_id: 789,
      body: expect.stringContaining("✅ Successfully created snapshot!"),
    });
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();

    const commentBody =
      mockOctokit.rest.issues.updateComment.mock.calls[0][0].body;
    expect(commentBody).toContain(
      "https://explore-openapi.dev/view?project=test-project&snapshot=updated-snapshot",
    );
    expect(commentBody).toContain(
      "https://explore-openapi.dev/compare/test-project/from/main/to/123",
    );
    expect(commentBody).toContain("Snapshot updated successfully");
  });

  it("should handle network errors gracefully in full flow", async () => {
    // Mock network error
    fetchMock.mockRejectedValueOnce(new Error("Network connection failed"));

    // Mock no existing comments
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    // Step 1: API call should throw network error
    await expect(
      sendSchemaToApi({
        apiUrl: "https://api.example.com/snapshot",
        schema: { openapi: "3.0.0" },
        authToken: "test-token",
        project: "test-project",
        snapshotName: "test-snapshot",
        permanent: false,
      }),
    ).rejects.toThrow("Network connection failed");

    // Step 2: In a real scenario, the action would catch this error and create a comment
    const errorResponse = {
      snapshot: null,
      sameAsBase: false,
      message: null,
      error: "Network connection failed",
    };

    await createOrUpdateComment(mockOctokit, errorResponse, "test-project");

    // Verify error comment was created
    const commentBody =
      mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain("❌ Failed to create snapshot");
    expect(commentBody).toContain("Network connection failed");
  });

  it("should handle GitHub API errors during comment creation", async () => {
    // Mock successful API response
    const mockApiResponse = {
      snapshot: {
        id: "snapshot-ghi789",
        projectId: "project-jkl012",
        name: "test-snapshot",
        status: "available" as const,
        hash: "hash789",
        size: 512,
        description: null,
        expiredAt: null,
        reason: null,
        createdAt: "2023-01-01T00:00:00Z",
        modifiedAt: "2023-01-01T00:00:00Z",
      },
      sameAsBase: false,
      message: "Snapshot created",
      error: null,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Mock GitHub API error when listing comments
    mockOctokit.rest.issues.listComments.mockRejectedValueOnce(
      new Error("GitHub API rate limit exceeded"),
    );

    // Step 1: Send schema to API (should succeed)
    const apiResult = await sendSchemaToApi({
      apiUrl: "https://api.example.com/snapshot",
      schema: { openapi: "3.0.0" },
      authToken: "test-token",
      project: "test-project",
      snapshotName: "test-snapshot",
      permanent: false,
    });

    expect(apiResult).toEqual(mockApiResponse);

    // Step 2: Comment creation should fail due to GitHub API error
    await expect(
      createOrUpdateComment(mockOctokit, apiResult, "test-project"),
    ).rejects.toThrow("GitHub API rate limit exceeded");
  });

  it("should handle different API response formats", async () => {
    // Mock API response with minimal data
    const mockApiResponse = {
      snapshot: {
        id: "snapshot-minimal",
        projectId: "project-minimal",
        name: "minimal-snapshot",
        status: "available" as const,
        hash: "hashmin",
        size: 256,
        description: null,
        expiredAt: null,
        reason: null,
        createdAt: "2023-01-01T00:00:00Z",
        modifiedAt: "2023-01-01T00:00:00Z",
      },
      sameAsBase: false,
      message: null,
      error: null,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    // Complete flow with minimal response
    const apiResult = await sendSchemaToApi({
      apiUrl: "https://api.example.com/snapshot",
      schema: { openapi: "3.0.0" },
      authToken: "test-token",
      project: "test-project",
      snapshotName: "test-snapshot",
      permanent: false,
    });

    await createOrUpdateComment(mockOctokit, apiResult, "test-project");

    const commentBody =
      mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain("✅ Successfully created snapshot!");
    expect(commentBody).toContain(
      "https://explore-openapi.dev/view?project=test-project&snapshot=minimal-snapshot",
    );
    expect(commentBody).toContain(
      "https://explore-openapi.dev/compare/test-project/from/main/to/123",
    );
    expect(commentBody).not.toContain("📝");
  });

  it("should send permanent flag correctly for branch/tag context", async () => {
    // Mock successful API response for permanent snapshot
    const mockApiResponse = {
      snapshot: {
        id: "snapshot-permanent",
        projectId: "project-branch",
        name: "branch-snapshot",
        status: "available" as const,
        hash: "hashperm",
        size: 2048,
        description: null,
        expiredAt: null,
        reason: null,
        createdAt: "2023-01-01T00:00:00Z",
        modifiedAt: "2023-01-01T00:00:00Z",
      },
      sameAsBase: false,
      message: null,
      error: null,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    // Test with permanent flag set to true
    const apiResult = await sendSchemaToApi({
      apiUrl: "https://api.example.com/snapshot",
      schema: { openapi: "3.0.0" },
      authToken: "test-token",
      project: "test-project",
      snapshotName: "branch-snapshot",
      permanent: true,
    });

    expect(apiResult).toEqual(mockApiResponse);

    // Verify the API was called with permanent: true
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshot",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          schema: { openapi: "3.0.0" },
          project: "test-project",
          name: "branch-snapshot",
          permanent: true,
        }),
      }),
    );

    // Create PR comment
    await createOrUpdateComment(mockOctokit, apiResult, "test-project");

    const commentBody =
      mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain("✅ Successfully created snapshot!");
    expect(commentBody).toContain(
      "https://explore-openapi.dev/view?project=test-project&snapshot=branch-snapshot",
    );
  });
});
