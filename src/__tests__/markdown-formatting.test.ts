import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrUpdateComment } from '../comment.js';

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
    id: 'snapshot-test123',
    projectId: 'project-test456',
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

describe('Markdown Formatting in Comments', () => {
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

    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: [],
    });
  });

  it('should format success comment with proper markdown structure', async () => {
    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: 'Snapshot created successfully',
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;

    // Check HTML comment identifier
    expect(commentBody).toMatch(/^<!-- openapi-snapshot-comment -->/);

    // Check markdown heading
    expect(commentBody).toContain('## 📸 OpenAPI Snapshot Created');

    // Check success emoji and text
    expect(commentBody).toContain('✅ Successfully created snapshot!');

    // Check bold markdown for URL labels
    expect(commentBody).toContain('🔗 **Snapshot URL:** https://explore-openapi.dev/view?projectId=project-test456&snapshotId=snapshot-test123');
    expect(commentBody).toContain('🔄 **Compare URL:** https://explore-openapi.dev/compare/project-test456/from/main/to/123');

    // Check message formatting
    expect(commentBody).toContain('📝 Snapshot created successfully');

    // Verify proper line breaks
    const lines = commentBody.split('\n');
    expect(lines[0]).toBe('<!-- openapi-snapshot-comment -->');
    expect(lines[1]).toBe('## 📸 OpenAPI Snapshot Created');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('✅ Successfully created snapshot!');
  });

  it('should format error comment with proper markdown structure', async () => {
    await createOrUpdateComment(mockOctokit, {
      success: false,
      message: 'Authentication failed: Invalid token provided',
    });

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;

    // Check HTML comment identifier
    expect(commentBody).toMatch(/^<!-- openapi-snapshot-comment -->/);

    // Check markdown heading
    expect(commentBody).toContain('## 📸 OpenAPI Snapshot Created');

    // Check error emoji and text
    expect(commentBody).toContain('❌ Failed to create snapshot');

    // Check bold markdown for error label
    expect(commentBody).toContain('**Error:** Authentication failed: Invalid token provided');

    // Verify proper line breaks
    const lines = commentBody.split('\n');
    expect(lines[0]).toBe('<!-- openapi-snapshot-comment -->');
    expect(lines[1]).toBe('## 📸 OpenAPI Snapshot Created');
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('❌ Failed to create snapshot');
    expect(lines[4]).toBe('');
    expect(lines[5]).toBe('**Error:** Authentication failed: Invalid token provided');
  });

  it('should handle URLs with special characters in markdown', async () => {
    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      id: 'test-123_abc',
      projectId: 'project-special-chars',
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain('🔗 **Snapshot URL:** https://explore-openapi.dev/view?projectId=project-special-chars&snapshotId=test-123_abc');
  });

  it('should handle messages with markdown characters', async () => {
    const messageWithMarkdown = 'Schema validation **passed** with _warnings_: `deprecated` fields found';

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: messageWithMarkdown,
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(`📝 ${messageWithMarkdown}`);
  });

  it('should handle messages with line breaks', async () => {
    const multilineMessage = 'Snapshot created with warnings:\n- Deprecated field: /paths/users/get/parameters/0\n- Missing description: /components/schemas/User';

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: multilineMessage,
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(`📝 ${multilineMessage}`);
  });

  it('should handle empty strings gracefully', async () => {
    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      // No message field
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;

    // Should still have basic structure
    expect(commentBody).toContain('<!-- openapi-snapshot-comment -->');
    expect(commentBody).toContain('## 📸 OpenAPI Snapshot Created');
    expect(commentBody).toContain('✅ Successfully created snapshot!');

    // Should contain URLs but not message section
    expect(commentBody).toContain('🔗 **Snapshot URL:**');
    expect(commentBody).not.toContain('📝');
  });

  it('should handle very long URLs without breaking markdown', async () => {
    const longId = 'a'.repeat(200);
    const longProjectId = 'project-' + 'b'.repeat(100);

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      id: longId,
      projectId: longProjectId,
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(`🔗 **Snapshot URL:** https://explore-openapi.dev/view?projectId=${longProjectId}&snapshotId=${longId}`);
  });

  it('should handle very long messages without breaking markdown', async () => {
    const veryLongMessage = 'This is a very long message that contains a lot of text. '.repeat(50);

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: veryLongMessage,
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(`📝 ${veryLongMessage}`);
  });

  it('should maintain consistent formatting across success and error states', async () => {
    // Test success comment
    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: 'Success message',
    }));

    const successBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    const successLines = successBody.split('\n');

    // Reset mock for error comment
    mockOctokit.rest.issues.createComment.mockClear();

    // Test error comment
    await createOrUpdateComment(mockOctokit, {
      success: false,
      message: 'Error message',
    });

    const errorBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    const errorLines = errorBody.split('\n');

    // Both should have same header structure
    expect(successLines[0]).toBe(errorLines[0]); // HTML comment
    expect(successLines[1]).toBe(errorLines[1]); // Heading
    expect(successLines[2]).toBe(errorLines[2]); // Empty line
  });

  it('should handle special markdown characters in error messages', async () => {
    const errorWithMarkdownChars = 'Error: `fetch` failed with status **401** - _Unauthorized_';

    await createOrUpdateComment(mockOctokit, {
      success: false,
      message: errorWithMarkdownChars,
    });

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(`**Error:** ${errorWithMarkdownChars}`);
  });

  it('should preserve code blocks in messages', async () => {
    const messageWithCodeBlock = 'Schema validation failed:\n```json\n{\n  "error": "Invalid format"\n}\n```';

    await createOrUpdateComment(mockOctokit, {
      success: false,
      message: messageWithCodeBlock,
    });

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(`**Error:** ${messageWithCodeBlock}`);
    expect(commentBody).toContain('```json');
    expect(commentBody).toContain('```');
  });

  it('should handle HTML entities in messages', async () => {
    const messageWithHtml = 'Schema contains &lt;deprecated&gt; fields &amp; missing &quot;required&quot; properties';

    await createOrUpdateComment(mockOctokit, createMockApiResponse({
      message: messageWithHtml,
    }));

    const commentBody = mockOctokit.rest.issues.createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(`📝 ${messageWithHtml}`);
  });
});
