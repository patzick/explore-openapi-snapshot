# Explore OpenAPI Snapshot

GitHub Action to create a snapshot of OpenAPI schema at https://explore-openapi.dev

## Features

- 📤 Send OpenAPI schema to explore-openapi.dev
- 🏷️ Automatic snapshot naming (PR number or branch name)
- 📁 Project-based organization
- 🔐 Secure authentication with auth token
- 💬 Automatic PR comment creation/update with snapshot results
- ⚡ Built with modern TypeScript tools (tsdown, vitest, oxlint)
- 🎯 Node 24+ support

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
    auth-token: ${{ secrets.API_AUTH_TOKEN }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `schema-file` | Path to the JSON schema file | Yes | - |
| `project` | Project name or project ID | Yes | - |
| `snapshot-name` | Snapshot name (auto-generated if not provided) | No | PR number (in PR context) or branch name |
| `auth-token` | Authentication token for API | Yes | - |
| `github-token` | GitHub token for commenting on PR | Yes | `${{ github.token }}` |

#### Snapshot Naming Logic

- **In Pull Request context**: Uses PR number (e.g., `123` for PR #123)
- **In Branch context**: Uses branch name (e.g., `feature/new-endpoint`)
- **Custom**: Provide your own `snapshot-name` to override automatic naming

### API Endpoint

The action sends your OpenAPI schema to `https://editor-api.explore-openapi.dev/public/v1/snapshot` with the following payload:

```json
{
  "schema": { /* your OpenAPI schema */ },
  "project": "your-project-name",
  "name": "your-snapshot-name"
}
```

### Outputs

| Output | Description |
|--------|-------------|
| `snapshot-url` | URL to the created snapshot |
| `response` | Full API response as JSON string |

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
