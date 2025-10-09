# explore-openapi-snapshot

GitHub Action to create a snapshot of OpenAPI schema at: https://explore-openapi.dev/

## Features

- 📤 Send OpenAPI schema to a specified API endpoint
- 🔐 Secure authentication with auth token
- 💬 Automatic PR comment creation/update with snapshot results
- ⚡ Built with modern TypeScript tools (tsdown, vitest, oxlint)
- 🎯 Node 20+ support

## Usage

### Basic Example

```yaml
name: Create OpenAPI Snapshot

on:
  pull_request:
    branches: [main]

jobs:
  snapshot:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create OpenAPI Snapshot
        uses: patzick/explore-openapi-snapshot@v1
        with:
          schema-file: './openapi.json'
          api-url: 'https://explore-openapi.dev/api/snapshot'
          auth-token: ${{ secrets.API_AUTH_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `schema-file` | Path to the JSON schema file | Yes | - |
| `api-url` | API endpoint URL to send the schema to | Yes | `https://explore-openapi.dev/api/snapshot` |
| `auth-token` | Authentication token for API | Yes | - |
| `github-token` | GitHub token for commenting on PR | Yes | `${{ github.token }}` |

### Outputs

| Output | Description |
|--------|-------------|
| `snapshot-url` | URL to the created snapshot |
| `response` | Full API response as JSON string |

## Development

### Prerequisites

- Node.js 20 or higher
- npm

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck

# Build action
npm run build
```

### Testing

The project uses [Vitest](https://vitest.dev/) for testing:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Building

The action is built using [tsdown](https://github.com/egoist/tsdown):

```bash
npm run build
```

This generates the compiled JavaScript in the `dist/` directory.

### Linting

The project uses [oxlint](https://oxc.rs/) for fast linting:

```bash
npm run lint
```

## Project Structure

```
.
├── src/
│   ├── index.ts        # Main entry point
│   ├── api.ts          # API communication logic
│   ├── comment.ts      # PR comment creation/update
│   └── __tests__/      # Test files
├── action.yml          # GitHub Action metadata
├── example-schema.json # Example OpenAPI schema
└── .github/
    └── workflows/
        └── test-action.yml # Example workflow
```

## License

MIT
