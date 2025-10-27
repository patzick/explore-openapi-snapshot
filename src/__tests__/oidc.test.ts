import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import { getOidcToken } from "../oidc.js";

// Mock @actions/core
vi.mock("@actions/core");

describe("getOidcToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get OIDC token successfully with default audience", async () => {
    const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
    vi.mocked(core.getIDToken).mockResolvedValueOnce(mockToken);

    const token = await getOidcToken();

    expect(token).toBe(mockToken);
    expect(core.getIDToken).toHaveBeenCalledWith(undefined);
  });

  it("should get OIDC token successfully with custom audience", async () => {
    const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
    const customAudience = "https://custom-audience.example.com";
    vi.mocked(core.getIDToken).mockResolvedValueOnce(mockToken);

    const token = await getOidcToken(customAudience);

    expect(token).toBe(mockToken);
    expect(core.getIDToken).toHaveBeenCalledWith(customAudience);
  });

  it("should throw error when OIDC token is empty", async () => {
    vi.mocked(core.getIDToken).mockResolvedValueOnce("");

    await expect(getOidcToken()).rejects.toThrow(
      "Failed to get OIDC token from GitHub Actions",
    );
  });

  it("should throw error when getIDToken fails", async () => {
    const error = new Error(
      "Unable to get OIDC token: id-token permission not granted",
    );
    vi.mocked(core.getIDToken).mockRejectedValueOnce(error);

    await expect(getOidcToken()).rejects.toThrow(
      "Failed to retrieve OIDC token: Unable to get OIDC token: id-token permission not granted",
    );
  });

  it("should handle non-Error exceptions", async () => {
    vi.mocked(core.getIDToken).mockRejectedValueOnce("String error");

    await expect(getOidcToken()).rejects.toThrow(
      "Failed to retrieve OIDC token: Unknown error",
    );
  });
});

