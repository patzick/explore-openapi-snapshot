# Changelog

## v2.0.0 - 2025-10-29

### Changed

- Replaced token-based authentication with GitHub Actions OIDC.
- Moved PR comment creation to the Explore OpenAPI GitHub App, including support for fork PR comments.
- Made snapshot retention automatic on the backend: PR snapshots expire after 30 days, while branch and tag snapshots are permanent.
- Simplified workflow permissions to require `id-token: write` instead of `pull-requests: write`.

### Removed

- Removed the `auth-token` input.
- Removed the `github-token` input.
- Removed the `permanent` input.

### Migration

- Install the Explore OpenAPI GitHub App.
- Update workflows from `@v1` to `@v2`.
- Remove deprecated inputs and long-lived API token secrets.
- Keep `schema-file`, `project`, and `snapshot-name`; these continue to work in v2.
