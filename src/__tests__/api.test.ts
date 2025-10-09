import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendSchemaToApi } from '../api.js';

// Mock fetch globally
global.fetch = vi.fn();

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

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await sendSchemaToApi(
      'https://api.example.com/snapshot',
      { openapi: '3.0.0' },
      'test-token'
    );

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/snapshot',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ openapi: '3.0.0' }),
      })
    );
  });

  it('should handle API errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      sendSchemaToApi(
        'https://api.example.com/snapshot',
        { openapi: '3.0.0' },
        'invalid-token'
      )
    ).rejects.toThrow('API request failed with status 401');
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      sendSchemaToApi(
        'https://api.example.com/snapshot',
        { openapi: '3.0.0' },
        'test-token'
      )
    ).rejects.toThrow('Network error');
  });
});
