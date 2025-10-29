import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendSchemaToApi } from "../api.js";

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("sendSchemaToApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send schema to API successfully", async () => {
    const mockResponse = {
      id: "snapshot-123",
      url: "https://explore-openapi.dev/view?project=test-project&snapshot=test-snapshot",
      sameAsBase: false,
      message: null,
      error: null,
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await sendSchemaToApi({
      apiUrl: "https://action.api.explore-openapi.dev/v1/snapshot",
      schema: { openapi: "3.0.0" },
      oidcToken: "test-oidc-token",
      project: "test-project",
      snapshotName: "test-snapshot",
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://action.api.explore-openapi.dev/v1/snapshot",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-oidc-token",
        },
        body: JSON.stringify({
          schema: { openapi: "3.0.0" },
          project: "test-project",
          snapshotName: "test-snapshot",
        }),
      }),
    );
  });

  it("should handle API errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(
      sendSchemaToApi({
        apiUrl: "https://action.api.explore-openapi.dev/v1/snapshot",
        schema: { openapi: "3.0.0" },
        oidcToken: "invalid-token",
        project: "test-project",
        snapshotName: "test-snapshot",
      }),
    ).rejects.toThrow("API request failed with status 401");
  });

  it("should handle network errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      sendSchemaToApi({
        apiUrl: "https://action.api.explore-openapi.dev/v1/snapshot",
        schema: { openapi: "3.0.0" },
        oidcToken: "test-token",
        project: "test-project",
        snapshotName: "test-snapshot",
      }),
    ).rejects.toThrow("Network error");
  });
});
