# Explore OpenAPI Snapshot

GitHub Action to create a snapshot of OpenAPI schema at https://explore-openapi.dev

## Features

- 📤 Send OpenAPI schema to explore-openapi.dev
- 🏷️ Automatic snapshot naming (PR number or branch name)
- 📁 Project-based organization
- 🔐 **Dual authentication modes**: OIDC (fork-friendly, no secrets needed) or auth token (legacy)
- 🍴 **Fork-friendly**: OIDC authentication works seamlessly with external contributor PRs
- 💬 Automatic PR comment creation/update with snapshot results
- ⏰ **Smart snapshot retention**: Permanent snapshots for branches/tags, temporary for PRs (30-day retention)
- 🔗 **Dual URLs**: Direct snapshot view + compare URLs for easy diff visualization
- ⚡ Built with modern TypeScript tools (tsdown, vitest, oxlint)
- 🎯 Node 20+ support

## Usage

### Recommended: OIDC Authentication (Fork-Friendly)

**🌟 This is the recommended approach** - it works with forks and doesn't require storing secrets!

**Minimal configuration:**
```yaml
name: Create OpenAPI Snapshot

on:
  pull_request:
  push:
    branches: [main]

jobs:
  snapshot:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # For OIDC authentication
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create OpenAPI Snapshot
        uses: patzick/explore-openapi-snapshot@v1
        with:
          schema-file: './openapi.json'
          project: 'my-api-project'
          use-oidc: 'true'
```

**Key Benefits of OIDC:**
- ✅ Works with external contributor PRs from forks
- ✅ No secrets to manage or rotate
- ✅ More secure - tokens are short-lived
- ✅ GitHub's native trust mechanism
- ✅ Simpler permissions - only `id-token: write` required

**📝 How PR Comments Work:**
- 🤖 PR comments are **posted by the backend GitHub App** 
- ✅ Works from forks and regular PRs alike
- 📊 Workflow summary also shows snapshot info for easy access in the Actions tab

### Legacy: Auth Token Method

For backward compatibility, the action still supports authentication via auth token:

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

**⚠️ Limitation:** This method won't work for external contributor PRs as secrets are not available to forks.

### Advanced Example with Custom Snapshot Name

```yaml
- name: Create OpenAPI Snapshot
  uses: patzick/explore-openapi-snapshot@v1
  with:
    schema-file: './api/openapi.json'
    project: 'my-api-project'
    snapshot-name: 'v2.1.0-beta'
    permanent: 'true'  # Override default behavior
    use-oidc: 'true'
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `schema-file` | Path to the JSON schema file | **Yes** | - |
| `project` | Project name or project ID | **Yes** | - |
| `snapshot-name` | Snapshot name (auto-generated if not provided) | No | PR number (in PR context) or branch name |
| `permanent` | Whether to create a permanent snapshot | No | `true` for branch/tag pushes, `false` for PRs |
| `use-oidc` | Use OIDC authentication (recommended) | No | `false` |
| `oidc-audience` | OIDC token audience | No | `https://explore-openapi.dev` |
| `auth-token` | Authentication token for API (legacy) | No* | - |
| `github-token` | GitHub token (deprecated) | No | `${{ github.token }}` |

**Truly Required Inputs:**
- `schema-file` - Path to your OpenAPI schema
- `project` - Your project identifier
- `use-oidc: 'true'` - When using OIDC authentication (recommended)
- OR `auth-token` - When using legacy authentication

**Optional/Deprecated:**
- `github-token` - Deprecated, not used (PR comments are posted by backend GitHub App)

#### Authentication Methods

**🌟 OIDC Authentication (Recommended):**
Set `use-oidc: 'true'` and add `id-token: write` permission to your workflow. This method:
- Works with external contributor PRs from forks
- Requires no secrets
- Uses short-lived tokens for better security

**Legacy Auth Token:**
The `auth-token` is technically optional but required when not using OIDC. When external contributors create PRs from forks without OIDC enabled, GitHub Actions doesn't expose repository secrets for security reasons. In these cases, the action will:
- Skip snapshot creation gracefully without failing
- Create an informative PR comment explaining the situation
- Allow maintainers to manually approve and re-run the workflow to create the snapshot

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

## External Contributor PRs (Fork PRs)

### With OIDC + GitHub App Backend (Recommended) 🌟

When using OIDC authentication with a GitHub App backend:

**What Works:**
- ✅ Snapshot creation (OIDC authentication succeeds)
- ✅ **PR comments** (posted by GitHub App from backend)
- ✅ All snapshot functionality

**How It Works:**
1. Fork PR runs the action with OIDC token
2. Backend validates OIDC token
3. Backend creates snapshot
4. **Backend uses GitHub App to post comment** (has permissions even for forks!)

**Result:** External contributors see comments just like repository members! 🎉

### With OIDC (Without GitHub App Backend)

If you haven't implemented the GitHub App backend yet, snapshots still work but with limitations:

**What Works:**
- ✅ Snapshot creation (OIDC authentication succeeds)
- ✅ Workflow summary with snapshot links
- ✅ All snapshot functionality

**What Doesn't Work:**
- ⚠️ PR comments (GitHub security prevents write access from forks)

**Where to Find Snapshot Info:**
1. Go to the **Actions** tab in the PR
2. Click on the workflow run
3. View the **workflow summary** - snapshot URL and compare URL will be there

### Example Workflow Summary (Fork PRs)

When the action runs from a fork, the workflow summary will show:

```markdown
## 📸 OpenAPI Snapshot

✅ **Snapshot created successfully!**

🔗 **Snapshot URL:** [View Snapshot](https://explore-openapi.dev/view?project=my-project&snapshot=123)

🔄 **Compare URL:** [Compare Changes](https://explore-openapi.dev/compare?project=my-project&baseSnapshot=main&featureSnapshot=123)

### Snapshot Details

- **Name:** `123`
- **Project:** `my-project`
- **Size:** 12.34 KB
- **Status:** available

---

💡 This snapshot was created using OIDC authentication. PR comments cannot be posted from fork workflows due to GitHub security restrictions.
```

### With Auth Token (Legacy)

When external contributors create PRs from forks, GitHub Actions doesn't expose repository secrets (including `auth-token`) for security reasons. The action handles this gracefully:

**Behavior:**
1. **No Failure**: The action completes successfully without failing the workflow
2. **Informative Comment**: An automatic PR comment is created explaining the situation (if permissions allow)
3. **Maintainer Action**: Repository maintainers can approve and re-run the workflow to create the snapshot

**Recommendation**: Switch to OIDC authentication for better fork support.

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
