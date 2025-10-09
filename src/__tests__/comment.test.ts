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
      },
    },
  },
  getOctokit: vi.fn(),
}));

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

    await createOrUpdateComment(mockOctokit, {
      success: true,
      snapshotUrl: 'https://example.com/snapshot/123',
      message: 'Success',
    });

    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('OpenAPI Snapshot Created'),
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

    await createOrUpdateComment(mockOctokit, {
      success: true,
      snapshotUrl: 'https://example.com/snapshot/123',
    });

    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      comment_id: 456,
      body: expect.stringContaining('OpenAPI Snapshot Created'),
    });
  });

  it('should format success message correctly', async () => {
    mockOctokit.rest.issues.listComments.mockResolvedValueOnce({
      data: [],
    });

    await createOrUpdateComment(mockOctokit, {
      success: true,
      snapshotUrl: 'https://example.com/snapshot/123',
      message: 'Snapshot created successfully',
    });

    const callArgs = mockOctokit.rest.issues.createComment.mock.calls[0][0];
    expect(callArgs.body).toContain('✅ Successfully created snapshot!');
    expect(callArgs.body).toContain('https://example.com/snapshot/123');
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
      createOrUpdateComment(mockOctokit, { success: true })
    ).rejects.toThrow('No pull request number found');

    // Restore context
    (github as any).context = originalContext;
  });
});
