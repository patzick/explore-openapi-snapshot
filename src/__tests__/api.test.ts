import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendSchemaToApi } from '../api.js';

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('sendSchemaToApi', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send schema to API successfully', async () => {
    const mockResponse = {
      success: true,
      snapshotUrl: 'https://example.com/snapshot/123',
      message: 'Snapshot created',
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await sendSchemaToApi(
      'https://editor-api.explore-openapi.dev/public/v1/snapshot',
      { openapi: '3.0.0' },
      'test-token',
      'test-project',
      'test-snapshot'
    );

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://editor-api.explore-openapi.dev/public/v1/snapshot',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          schema: { openapi: '3.0.0' },
          project: 'test-project',
          name: 'test-snapshot'
        }),
      })
    );
  });

  it('should handle API errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      sendSchemaToApi(
        'https://editor-api.explore-openapi.dev/public/v1/snapshot',
        { openapi: '3.0.0' },
        'invalid-token',
        'test-project',
        'test-snapshot'
      )
    ).rejects.toThrow('API request failed with status 401');
  });

  it('should handle network errors', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      sendSchemaToApi(
        'https://editor-api.explore-openapi.dev/public/v1/snapshot',
        { openapi: '3.0.0' },
        'test-token',
        'test-project',
        'test-snapshot'
      )
    ).rejects.toThrow('Network error');
  });
});
