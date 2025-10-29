/**
 * Creates a mock JWT token with a custom payload
 * This is useful for testing OIDC token scenarios
 *
 * @param payload - The JWT payload object to encode
 * @returns A mock JWT string in the format: header.payload.signature
 */
export function createMockJwt(payload: Record<string, unknown>): string {
  // Standard JWT header for HS256
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Base64url encode (simplified for testing - not cryptographically secure)
  const base64UrlEncode = (obj: Record<string, unknown>): string => {
    const json = JSON.stringify(obj);
    return Buffer.from(json)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  // Mock signature (not cryptographically valid, but sufficient for testing)
  const mockSignature = "mock_signature_for_testing";

  return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
}

type GitHubEventType = "push" | "pr" | "tag";

interface MockGitHubOidcTokenOptions {
  owner?: string;
  repo?: string;
  eventType?: GitHubEventType;
}

/**
 * Creates a mock GitHub OIDC token with typical GitHub Actions claims
 *
 * @param overrides - Optional overrides for default claims
 * @param options - Configuration options for the token
 * @param options.owner - Repository owner (default: "owner")
 * @param options.repo - Repository name (default: "repo")
 * @param options.eventType - Type of GitHub event: "push", "pr", or "tag" (default: "push")
 * @returns A mock JWT string with GitHub OIDC claims
 */
export function createMockGitHubOidcToken(
  overrides?: Record<string, unknown>,
  options?: MockGitHubOidcTokenOptions,
): string {
  const owner = options?.owner || "owner";
  const repo = options?.repo || "repo";
  const eventType = options?.eventType || "push";

  // Base payload common to all event types
  const basePayload = {
    iss: "https://token.actions.githubusercontent.com",
    aud: "https://explore-openapi.dev",
    repository: `${owner}/${repo}`,
    repository_owner: owner,
    repository_owner_id: "13100280",
    repository_id: "1072887959",
    repository_visibility: "public",
    run_id: "123456789",
    run_number: "42",
    run_attempt: "1",
    actor: "octocat",
    actor_id: "12345678",
    workflow: "CI",
    runner_environment: "github-hosted",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    nbf: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
  };

  // Event-specific configurations
  let eventPayload: Record<string, unknown>;

  switch (eventType) {
    case "pr":
      eventPayload = {
        event_name: "pull_request",
        ref: "refs/pull/123/merge",
        ref_type: "branch",
        head_ref: "feature-branch",
        base_ref: "main",
        sha: "abc123def456",
        sub: `repo:${owner}/${repo}:pull_request`,
        job_workflow_ref: `${owner}/${repo}/.github/workflows/ci.yml@refs/pull/123/merge`,
        workflow_ref: `${owner}/${repo}/.github/workflows/ci.yml@refs/pull/123/merge`,
        workflow_sha: "abc123def456",
        job_workflow_sha: "abc123def456",
      };
      break;

    case "tag":
      eventPayload = {
        event_name: "push",
        ref: "refs/tags/v1.0.0",
        ref_type: "tag",
        ref_protected: "false",
        head_ref: "",
        base_ref: "",
        sha: "abc123def456",
        sub: `repo:${owner}/${repo}:ref:refs/tags/v1.0.0`,
        job_workflow_ref: `${owner}/${repo}/.github/workflows/ci.yml@refs/tags/v1.0.0`,
        workflow_ref: `${owner}/${repo}/.github/workflows/ci.yml@refs/tags/v1.0.0`,
        workflow_sha: "abc123def456",
        job_workflow_sha: "abc123def456",
      };
      break;

    default:
      // Default to push event to main branch
      eventPayload = {
        event_name: "push",
        ref: "refs/heads/main",
        ref_type: "branch",
        ref_protected: "true",
        head_ref: "",
        base_ref: "",
        sha: "abc123def456",
        sub: `repo:${owner}/${repo}:ref:refs/heads/main`,
        job_workflow_ref: `${owner}/${repo}/.github/workflows/ci.yml@refs/heads/main`,
        workflow_ref: `${owner}/${repo}/.github/workflows/ci.yml@refs/heads/main`,
        workflow_sha: "abc123def456",
        job_workflow_sha: "abc123def456",
      };
      break;
  }

  const defaultPayload = {
    ...basePayload,
    ...eventPayload,
    ...overrides,
  };

  return createMockJwt(defaultPayload);
}
