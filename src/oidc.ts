import * as core from "@actions/core";

/**
 * Get GitHub OIDC token for authentication
 * This token can be used to authenticate with external services
 * that trust GitHub's OIDC provider
 */
export async function getOidcToken(audience?: string): Promise<string> {
  try {
    const oidcToken = await core.getIDToken(audience);
    if (!oidcToken) {
      throw new Error("Failed to get OIDC token from GitHub Actions");
    }
    return oidcToken;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to retrieve OIDC token: ${errorMessage}`);
  }
}

