import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrUpdateComment } from '../comment.js';
import * as github from '@actions/github';

// Mock @actions/github
vi.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo',
    },
    payload: {
      pull_request: {
        number: 123,
        base: {
          ref: 'main',
        },
      },
    },
  },
  getOctokit: vi.fn(),
}));

// Helper function to create mock API responses
function createMockApiResponse(overrides: Partial<any> = {}) {
  return {
    id: 'snapshot-123',
    projectId: 'project-456',
    name: 'test-snapshot',
    status: 'available',
    hash: 'abc123',
    size: 1024,
    active: true,
    createdAt: '2023-01-01T00:00:00Z',
    modifiedAt: '2023-01-01T00:00:00Z',
    description: null,
    expiredAt: null,
    reason: null,
    ...overrides,
  };
}

describe('createOrUpdateComment', () => {
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

  it('should create a new comment when none exists', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: 'Success',
    }));

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('OpenAPI Snapshot'),
    });
  });

  it('should update existing comment', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [
        {
          id: 456,
          body: '<!-- openapi-snapshot-comment -->\nOld content',
        },
      ],
    });

    await createOrUpdateComment(mockOctokit, createMockApiResponse());

    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      comment_id: 456,
      body: expect.stringContaining('OpenAPI Snapshot'),
    });
  });

  it('should format success message correctly', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: 'Snapshot created successfully',
    }));

    const callArgs = mockOctokit.rest.issues.createComment.mock.calls[0][0];
    expect(callArgs.body).toContain('✅ Successfully created snapshot!');
    expect(callArgs.body).toContain('https://explore-openapi.dev/view?project=project-456&snapshot=snapshot-123');
    expect(callArgs.body).toContain('https://explore-openapi.dev/compare/project-456/from/main/to/123');
    expect(callArgs.body).toContain('Snapshot created successfully');
  });

  it('should format error message correctly', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, {
      success: false,
      message: 'API error occurred',
    });

    const callArgs = mockOctokit.rest.issues.createComment.mock.calls[0][0];
    expect(callArgs.body).toContain('❌ Failed to create snapshot');
    expect(callArgs.body).toContain('API error occurred');
  });

  it('should throw error when not in PR context', async () => {
    const originalContext = github.context;
    (github as any).context = {
      ...originalContext,
      payload: {},
    };

    await expect(
      createOrUpdateComment(mockOctokit, createMockApiResponse())
    ).rejects.toThrow('No pull request number found');

    // Restore context
    (github as any).context = originalContext;
  });

  it('should handle API response without message', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, createMockApiResponse());

    const callArgs = mockOctokit.rest.issues.createComment.mock.calls[0][0];
    expect(callArgs.body).toContain('✅ Successfully created snapshot!');
    expect(callArgs.body).toContain('https://explore-openapi.dev/view?project=project-456&snapshot=snapshot-123');
    expect(callArgs.body).toContain('https://explore-openapi.dev/compare/project-456/from/main/to/123');
    expect(callArgs.body).not.toContain('📝');
  });

  it('should handle API response with message', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: 'Snapshot created with warnings',
    }));

    const callArgs = mockOctokit.rest.issues.createComment.mock.calls[0][0];
    expect(callArgs.body).toContain('✅ Successfully created snapshot!');
    expect(callArgs.body).toContain('https://explore-openapi.dev/view?project=project-456&snapshot=snapshot-123');
    expect(callArgs.body).toContain('📝 Snapshot created with warnings');
  });

  it('should handle error response without message', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, {
      success: false,
      message: '',
    });

    const callArgs = mockOctokit.rest.issues.createComment.mock.calls[0][0];
    expect(callArgs.body).toContain('❌ Failed to create snapshot');
    expect(callArgs.body).not.toContain('**Error:**');
  });

  it('should include comment identifier in all comments', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: 'Test message',
    }));

    const callArgs = mockOctokit.rest.issues.createComment.mock.calls[0][0];
    expect(callArgs.body).toContain('<!-- openapi-snapshot-comment -->');
  });

  it('should properly identify existing comments by identifier', async () => {
    const comments = [
      { id: 1, body: 'Some other comment' },
      { id: 2, body: 'Another comment' },
      { id: 3, body: '<!-- openapi-snapshot-comment -->\nExisting snapshot comment' },
      { id: 4, body: 'Yet another comment' },
    ];

    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: comments,
    });

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: 'Updated comment',
    }));

    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      comment_id: 3,
      body: expect.stringContaining('Updated comment'),
    });
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it('should handle GitHub API errors gracefully', async () => {
    mockOctokit.rest.issues.listComments.mockRejectedValueOnce(
      new Error('GitHub API error')
    );

    await expect(
      createOrUpdateComment(mockOctokit, createMockApiResponse())
    ).rejects.toThrow('GitHub API error');
  });

  it('should handle comment creation failure', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });
    mockOctokit.rest.issues.createComment.mockRejectedValueOnce(
      new Error('Failed to create comment')
    );

    await expect(
      createOrUpdateComment(mockOctokit, createMockApiResponse())
    ).rejects.toThrow('Failed to create comment');
  });

  it('should handle comment update failure', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [
        {
          id: 456,
          body: '<!-- openapi-snapshot-comment -->\nOld content',
        },
      ],
    });
    mockOctokit.rest.issues.updateComment.mockRejectedValueOnce(
      new Error('Failed to update comment')
    );

    await expect(
      createOrUpdateComment(mockOctokit, createMockApiResponse())
    ).rejects.toThrow('Failed to update comment');
  });
});
