import type { SnapshotReturn } from "../types";

/**
 * Create a mock snapshot response for testing
 */
export function createMockSnapshotResponse(
  overrides?: Partial<SnapshotReturn>,
): SnapshotReturn {
  return {
    id: "snapshot-123",
    url: "https://explore-openapi.dev/view?project=test-project&snapshot=test-snapshot",
    sameAsBase: false,
    message: null,
    error: null,
    ...overrides,
  };
}
