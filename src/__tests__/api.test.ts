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
      'test-snapshot',
      false
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
          name: 'test-snapshot',
          permanent: false
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
        'test-snapshot',
        false
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
        'test-snapshot',
        false
      )
    ).rejects.toThrow('Network error');
  });

  it('should send permanent flag when set to true', async () => {
    const mockResponse = {
      id: 'snapshot-permanent',
      projectId: 'project-456',
      name: 'permanent-snapshot',
      status: 'available',
      hash: 'abc123',
      size: 1024,
      active: true,
      createdAt: '2023-01-01T00:00:00Z',
      modifiedAt: '2023-01-01T00:00:00Z',
      description: null,
      expiredAt: null,
      reason: null,
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
      'permanent-snapshot',
      true
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
          name: 'permanent-snapshot',
          permanent: true
        }),
      })
    );
  });
});
