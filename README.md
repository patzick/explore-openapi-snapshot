# Explore OpenAPI Snapshot

GitHub Action to create a snapshot of OpenAPI schema at https://explore-openapi.dev

## Features

- 📤 Send OpenAPI schema to explore-openapi.dev
- 🏷️ Automatic snapshot naming (PR number or branch name)
- 📁 Project-based organization
- 🔐 Secure authentication with auth token
- 💬 Automatic PR comment creation/update with snapshot results
- ⏰ **Smart snapshot retention**: Permanent snapshots for branches/tags, temporary for PRs (30-day retention)
- 🔗 **Dual URLs**: Direct snapshot view + compare URLs for easy diff visualization
- ⚡ Built with modern TypeScript tools (tsdown, vitest, oxlint)
- 🎯 Node 20+ support

## Usage

### Basic Example

```yaml
name: Create OpenAPI Snapshot

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  snapshot:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create OpenAPI Snapshot
        uses: patzick/explore-openapi-snapshot@v1
        with:
          schema-file: './openapi.json'
          project: 'my-api-project'
          auth-token: ${{ secrets.API_AUTH_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Example with Custom Snapshot Name

```yaml
- name: Create OpenAPI Snapshot
  uses: patzick/explore-openapi-snapshot@v1
  with:
    schema-file: './api/openapi.json'
    project: 'my-api-project'
    snapshot-name: 'v2.1.0-beta'
    permanent: 'true'  # Override default behavior
    auth-token: ${{ secrets.API_AUTH_TOKEN }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `schema-file` | Path to the JSON schema file | Yes | - |
| `project` | Project name or project ID | Yes | - |
| `snapshot-name` | Snapshot name (auto-generated if not provided) | No | PR number (in PR context) or branch name |
| `permanent` | Whether to create a permanent snapshot | No | `true` for branch/tag pushes, `false` for PRs |
| `auth-token` | Authentication token for API | No* | - |
| `github-token` | GitHub token for commenting on PR | Yes | `${{ github.token }}` |

**\*Note on `auth-token` for External Contributors:**
The `auth-token` is technically optional but required for snapshot creation. When external contributors create PRs from forks, GitHub Actions doesn't expose repository secrets for security reasons. In these cases, the action will:
- Skip snapshot creation gracefully without failing
- Create an informative PR comment explaining the situation
- Allow maintainers to manually approve and re-run the workflow to create the snapshot

For repository members and maintainers, the `auth-token` should always be provided.

#### Snapshot Naming Logic

- **In Pull Request context**: Uses PR number (e.g., `123` for PR #123)
- **In Branch context**: Uses branch name (e.g., `feature/new-endpoint`)
- **In Tag context**: Uses tag name (e.g., `v1.0.0` for tag `refs/tags/v1.0.0`)
- **Custom**: Provide your own `snapshot-name` to override automatic naming

#### Snapshot Retention Policy

The action automatically determines snapshot retention based on context:

| Context | Permanent | Retention | Use Case |
|---------|-----------|-----------|----------|
| **Pull Request** | `false` | **30 days** | Temporary snapshots for review and testing |
| **Branch Push** | `true` | **Permanent** | Long-term snapshots for development branches |
| **Tag Push** | `true` | **Permanent** | Release snapshots and version history |

**Key Benefits:**
- 🗑️ **Automatic cleanup**: PR snapshots are automatically removed after 30 days to keep your project organized
- 📚 **Permanent history**: Branch and tag snapshots are kept permanently for long-term reference
- 🎛️ **Manual override**: Use the `permanent` input to override the default behavior when needed

**Override Examples:**
```yaml
# Force permanent snapshot for a PR (useful for important feature branches)
permanent: 'true'

# Create temporary snapshot for a branch push (useful for experimental branches)
permanent: 'false'
```

### API Endpoint

The action sends your OpenAPI schema to `https://editor-api.explore-openapi.dev/public/v1/snapshot` with the following payload:

```json
{
  "schema": { /* your OpenAPI schema */ },
  "project": "your-project-name",
  "name": "your-snapshot-name",
  "permanent": true,
  "baseBranchName": "main"
}
```

**Payload Fields:**
- `schema` - Your OpenAPI schema object
- `project` - Project name from action input
- `name` - Snapshot name (PR number or branch name)
- `permanent` - Boolean indicating if snapshot should be permanent
- `baseBranchName` - Base branch name (only included for PR contexts)

### Outputs

| Output | Description |
|--------|-------------|
| `snapshot-url` | URL to the created snapshot |
| `response` | Full API response as JSON string |

## External Contributor PRs

When external contributors create PRs from forks, GitHub Actions doesn't expose repository secrets (including `API_AUTH_TOKEN`) for security reasons. The action handles this gracefully:

### Behavior for External PRs

1. **No Failure**: The action completes successfully without failing the workflow
2. **Informative Comment**: An automatic PR comment is created explaining the situation
3. **Maintainer Action**: Repository maintainers can approve and re-run the workflow to create the snapshot

### Example PR Comment for External Contributors

```markdown
## 📸 OpenAPI Snapshot

⏭️ Snapshot creation skipped for external contributor PR. A maintainer can approve and re-run the workflow to create the snapshot.
```

### Maintainer Workflow

1. Review the external contributor's PR
2. If you want to create a snapshot, go to the Actions tab
3. Find the failed workflow run
4. Click "Re-run jobs" → "Re-run all jobs"
5. Approve the workflow run when prompted
6. The snapshot will be created and the PR comment will be updated

### Alternative: Using `pull_request_target`

⚠️ **Security Warning**: Only use this if you fully understand the security implications.

You can modify your workflow to use `pull_request_target` instead of `pull_request`. This event runs in the context of the base repository and has access to secrets:

```yaml
on:
  pull_request_target:  # Instead of pull_request
    branches: [main]
```

**Important**: This approach runs with access to secrets even for untrusted code from external contributors. Only use this if you trust all contributors or have additional security measures in place.

### PR Comments

When running in a Pull Request context, the action automatically creates or updates a comment with different content based on whether changes were detected:

#### When Changes Are Detected (`sameAsBase: false`)

The comment includes:
- ✅ **Success status**
- 🔄 **Compare URL**: Link to compare changes between base and feature branches
- 🔗 **Snapshot URL**: Direct link to view the new snapshot
- 📝 **Additional messages** from the API response

**Example PR Comment with Changes:**
```markdown
## 📸 OpenAPI Snapshot

✅ Successfully created snapshot!

🔄 **Compare URL:** https://explore-openapi.dev/compare?project=my-project&baseSnapshot=main&featureSnapshot=123

🔗 **Snapshot URL:** https://explore-openapi.dev/view?project=my-project&snapshot=pr-snapshot-name

📝 Schema validation passed with 2 warnings
```

#### When No Changes Are Detected (`sameAsBase: true`)

The comment shows that the schema is identical to the base branch:
- ℹ️ **No changes message** with base branch name
- 🔗 **Base branch snapshot link** for reference

**Example PR Comment with No Changes:**
```markdown
## 📸 OpenAPI Snapshot

ℹ️ No changes detected compared to main

🔗 **Base Branch Snapshot:** https://explore-openapi.dev/view?project=my-project&snapshot=main
```

#### Error Handling

When the action fails, an error comment is created:

**Example Error Comment:**
```markdown
## 📸 OpenAPI Snapshot

❌ Failed to create snapshot

**Error:** Authentication failed: Invalid token provided
```

## Development

### Prerequisites

- Node.js 20 or higher
- pnpm (recommended) or npm

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

The project uses [Vitest](https://vitest.dev/) for testing:

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run end-to-end tests (requires .env file)
pnpm run test:e2e
```

#### End-to-End Testing

E2E tests make real API calls to verify the integration works correctly. To run them:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`:
   ```bash
   API_URL=https://editor-api.explore-openapi.dev/api/snapshot  # or your local dev server
   API_AUTH_TOKEN=your_actual_api_token
   TEST_PROJECT=your-test-project
   TEST_SNAPSHOT_NAME=e2e-test-snapshot
   ```

3. Run the E2E tests:
   ```bash
   pnpm run test:e2e
   ```

The E2E tests will:
- Send a real OpenAPI schema to the configurable API endpoint
- Snapshot the response for regression testing
- Verify the response structure
- Log the actual API response for debugging
- Support both production and local development endpoints

### Building

The action is built using [tsdown](https://github.com/egoist/tsdown):

```bash
pnpm run build
```

This generates the compiled JavaScript in the `dist/` directory.

### Linting

The project uses [oxlint](https://oxc.rs/) for fast linting:

```bash
pnpm run lint
```

## Project Structure

```
.
├── src/
│   ├── index.ts        # Main entry point
│   ├── api.ts          # API communication logic
│   ├── comment.ts      # PR comment creation/update
│   └── __tests__/      # Test files
│       ├── *.test.ts   # Unit tests
│       └── *.e2e.test.ts # End-to-end tests
├── action.yml          # GitHub Action metadata
├── example-schema.json # Example OpenAPI schema
├── .env.example        # Environment variables template
└── .github/
    └── workflows/
        └── test-action.yml # Example workflow
```

## License

MIT
