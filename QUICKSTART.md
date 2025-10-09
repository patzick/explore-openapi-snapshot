# Quick Start Guide

This guide will help you get started with the OpenAPI Snapshot GitHub Action in just a few minutes.

## Step 1: Get Your API Token

Before using this action, you'll need an authentication token from https://explore-openapi.dev/

Store it as a secret in your GitHub repository:
1. Go to your repository Settings
2. Navigate to Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `API_AUTH_TOKEN`
5. Value: Your API token

## Step 2: Create Your OpenAPI Schema

Create an OpenAPI schema file in your repository (e.g., `openapi.json`):

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get users",
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}
```

## Step 3: Create a Workflow

Create `.github/workflows/openapi-snapshot.yml`:

```yaml
name: OpenAPI Snapshot

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: patzick/explore-openapi-snapshot@v1
        with:
          schema-file: './openapi.json'
          auth-token: ${{ secrets.API_AUTH_TOKEN }}
```

## Step 4: Test It

1. Create a pull request
2. The action will run automatically
3. Check the PR comments for the snapshot result

## Next Steps

- Customize the `api-url` input if needed
- Add multiple schema files for different APIs
- Integrate with your CI/CD pipeline

For more details, see the [README.md](README.md).
