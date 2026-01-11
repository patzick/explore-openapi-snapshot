# Explore OpenAPI Snapshot

GitHub Action to create snapshots of your OpenAPI schema at [explore-openapi.dev](https://explore-openapi.dev)

## Features

- 📤 Send OpenAPI schema to explore-openapi.dev
- 🏷️ Automatic snapshot naming (PR number or branch name)
- 📁 Project-based organization
- 🔐 **OIDC Authentication**: Secure, no secrets needed
- 🍴 **Fork-friendly**: Works seamlessly with external contributor PRs
- 💬 Automatic PR comment creation/update with snapshot results
- ⏰ **Smart snapshot retention**: Permanent snapshots for branches/tags, temporary for PRs (30-day retention)
- 🔗 **Dual URLs**: Direct snapshot view + compare URLs for easy diff visualization
- ⚡ Built with modern TypeScript tools (tsdown, vitest, oxlint)
- 🎯 Node 20+ support

## Quick Start

### 1. Install the Explore OpenAPI GitHub App

First, install the [Explore OpenAPI GitHub App](https://github.com/apps/explore-openapi/installations/new) to your repository. This app is required to post PR comments, especially for fork PRs.

### 2. Add the Action to Your Workflow

Create or update your workflow file (e.g., `.github/workflows/openapi-snapshot.yml`):

```yaml
name: OpenAPI Snapshot

on:
  pull_request:
  push:
    branches: [main]

jobs:
  snapshot:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required for OIDC authentication

    steps:
      - uses: actions/checkout@v4

      - name: Create OpenAPI Snapshot
        uses: patzick/explore-openapi-snapshot@v2
        with:
          schema-file: "./openapi.json"
          project: "my-api-project"
```

That's it! The action will:

- ✅ Authenticate using OIDC (no secrets needed)
- ✅ Create snapshots for every PR and push
- ✅ Post comments on PRs with snapshot links (via GitHub App)
- ✅ Work perfectly with external contributor PRs from forks

## How It Works

### Authentication

The action uses **OIDC (OpenID Connect)** for secure, token-based authentication:

1. GitHub Actions generates a short-lived OIDC token
2. The token is sent to the Explore OpenAPI backend
3. Backend validates the token and creates the snapshot
4. No secrets or API keys needed!

**Required Permission**: Your workflow must have `id-token: write` permission.

### PR Comments

PR comments are posted by the **Explore OpenAPI GitHub App**, not by the action itself. This architecture enables:

- ✅ Comments on PRs from forks (external contributors)
- ✅ No need for `GITHUB_TOKEN` or `pull-requests: write` permission
- ✅ Consistent comment format across all PRs

**Important**: You must [install the GitHub App](https://github.com/apps/explore-openapi/installations/new) for PR comments to work.

### Snapshot Retention

Snapshots are automatically managed based on context:

| Context          | Retention | Use Case                       |
| ---------------- | --------- | ------------------------------ |
| **Pull Request** | 30 days   | Temporary snapshots for review |
| **Branch Push**  | Permanent | Development branch history     |
| **Tag Push**     | Permanent | Release snapshots              |

## Inputs

| Input           | Description                  | Required | Default                  |
| --------------- | ---------------------------- | -------- | ------------------------ |
| `schema-file`   | Path to the JSON schema file | **Yes**  | -                        |
| `project`       | Project name or project ID   | **Yes**  | -                        |
| `snapshot-name` | Custom snapshot name         | No       | PR number or branch name |

### Snapshot Naming

The action automatically generates snapshot names:

- **Pull Requests**: Uses PR number (e.g., `123` for PR #123)
- **Branch Pushes**: Uses branch name (e.g., `feature/new-endpoint`)
- **Tag Pushes**: Uses tag name (e.g., `v1.0.0`)
- **Custom**: Override with `snapshot-name` input

## Outputs

| Output         | Description                      |
| -------------- | -------------------------------- |
| `snapshot-url` | URL to view the created snapshot |
| `response`     | Full API response as JSON string |

### Using Outputs

```yaml
- name: Create OpenAPI Snapshot
  id: snapshot
  uses: patzick/explore-openapi-snapshot@v2
  with:
    schema-file: "./openapi.json"
    project: "my-api-project"

- name: Use snapshot URL
  run: echo "Snapshot created at ${{ steps.snapshot.outputs.snapshot-url }}"
```

## Fork PRs (External Contributors)

The action **fully supports external contributor PRs** thanks to OIDC authentication and the GitHub App:

**How it works:**

1. Fork PR triggers the workflow
2. Action obtains OIDC token (no secrets needed)
3. Backend validates token and creates snapshot
4. **GitHub App posts comment** (has permissions even for forks)

**Result**: External contributors see the same snapshot comments as repository members! 🎉

## Advanced Configuration

### Custom Snapshot Names

```yaml
- name: Create OpenAPI Snapshot
  uses: patzick/explore-openapi-snapshot@v2
  with:
    schema-file: "./api/openapi.json"
    project: "my-api-project"
    snapshot-name: "v2.1.0-beta"
```

### Multiple Schemas

```yaml
- name: Snapshot Public API
  uses: patzick/explore-openapi-snapshot@v2
  with:
    schema-file: "./public-api.json"
    project: "my-project-public"

- name: Snapshot Internal API
  uses: patzick/explore-openapi-snapshot@v2
  with:
    schema-file: "./internal-api.json"
    project: "my-project-internal"
```

## Troubleshooting

### "Failed to obtain OIDC token"

**Cause**: Missing `id-token: write` permission.

**Solution**: Add to your workflow:

```yaml
permissions:
  id-token: write
```

### PR Comments Not Appearing

**Cause**: GitHub App not installed.

**Solution**: [Install the Explore OpenAPI GitHub App](https://github.com/apps/explore-openapi/installations/new) to your repository.

### "Invalid project"

**Cause**: Project doesn't exist or isn't authorized for your repository.

**Solution**: Contact the Explore OpenAPI team to set up your project.

## Migration from v1

If you're upgrading from v1, see the [Migration Guide](./MIGRATION_GUIDE.md) for detailed instructions.

**Key changes in v2:**

- ✅ OIDC is now the only authentication method (simpler!)
- ✅ No more `use-oidc`, `auth-token`, or `github-token` inputs
- ✅ Requires [GitHub App installation](https://github.com/apps/explore-openapi/installations/new)

## Development

### Prerequisites

- Node.js 24 or higher
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Lint code
pnpm run lint

# Type check
pnpm run typecheck

# Build action
pnpm run build
```

### Testing

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run end-to-end tests (requires .env file)
pnpm run test:e2e
```

## Project Structure

```
.
├── src/
│   ├── index.ts           # Main entry point
│   ├── api.ts             # API communication
│   ├── oidc.ts            # OIDC token handling
│   ├── types.ts           # Type definitions
│   └── __tests__/         # Test files
├── .github/workflows/     # GitHub Actions workflows
├── action.yml             # Action metadata
├── example-schema.json    # Example OpenAPI schema
└── MIGRATION_GUIDE.md     # v1 to v2 migration guide
```

## Security

- **OIDC Authentication**: Uses GitHub's native OIDC provider for secure, short-lived tokens
- **No Secrets**: No API keys or tokens to manage or rotate
- **Minimal Permissions**: Only requires `id-token: write`
- **GitHub App**: Comments posted via official GitHub App with minimal permissions

## Support

- 📖 [Documentation](https://explore-openapi.dev/docs)
- 🐛 [Report Issues](https://github.com/patzick/explore-openapi-snapshot/issues)
- 💬 [Discussions](https://github.com/patzick/explore-openapi-snapshot/discussions)

## License

MIT
