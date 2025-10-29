# Migration Guide: v1 → v2

This guide helps you migrate from v1 to v2 of the Explore OpenAPI Snapshot action.

## What's New in v2

### ✨ Simplified Authentication

v2 uses **only OIDC authentication**, replacing the token-based authentication:

- ✅ No more `auth-token` input (OIDC tokens are automatic)
- ✅ No more `github-token` input (not needed)

### 🗂️ Automatic Snapshot Retention

v2 handles snapshot retention automatically on the backend:

- ✅ No more `permanent` input (backend decides based on context)
- ✅ PR snapshots: 30-day retention (automatic)
- ✅ Branch/tag snapshots: Permanent (automatic)

### 🤖 GitHub App Required

v2 requires the [Explore OpenAPI GitHub App](https://github.com/apps/explore-openapi/installations/new) to be installed for PR comments to work, especially for fork PRs.

### 🔒 Enhanced Security

- OIDC is now the only authentication method (more secure, no secrets)
- Shorter-lived tokens
- Minimal permissions required

## Migration Steps

### Step 1: Install the GitHub App

**Before updating your workflow**, install the [Explore OpenAPI GitHub App](https://github.com/apps/explore-openapi/installations/new) to your repository:

1. Visit https://github.com/apps/explore-openapi/installations/new
2. Select your repository
3. Click "Install"

### Step 2: Update Your Workflow

Update your workflow file to use v2 and remove deprecated inputs.

#### Before (v1)

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
      pull-requests: write  # ❌ Not needed in v2
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create OpenAPI Snapshot
        uses: patzick/explore-openapi-snapshot@v1
        with:
          schema-file: './openapi.json'
          project: 'my-api-project'
          auth-token: ${{ secrets.API_AUTH_TOKEN }}  # ❌ Removed in v2
          github-token: ${{ secrets.GITHUB_TOKEN }}  # ❌ Removed in v2
```

#### After (v2)

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
      id-token: write  # ✅ Only permission needed
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create OpenAPI Snapshot
        uses: patzick/explore-openapi-snapshot@v2  # ✅ Updated version
        with:
          schema-file: './openapi.json'
          project: 'my-api-project'
          # ✅ That's it! Much simpler.
```

### Step 3: Remove Deprecated Inputs

Remove these inputs from your workflow:

| Removed Input | Reason | v2 Equivalent |
|---------------|--------|---------------|
| `auth-token` | Replaced by OIDC | *(automatic)* |
| `github-token` | PR comments via GitHub App | *(not needed)* |
| `permanent` | Backend handles retention | *(automatic)* |

### Step 4: Update Permissions

Add `id-token: write` and remove `pull-requests: write`:

```yaml
permissions:
  id-token: write  # Add this
  # pull-requests: write  # Remove this
```

## Migration Scenarios

### Scenario 1: Standard v1 Configuration

Most v1 users had this configuration:

**v1 Configuration:**
```yaml
- uses: patzick/explore-openapi-snapshot@v1
  with:
    schema-file: './openapi.json'
    project: 'my-project'
    auth-token: ${{ secrets.API_AUTH_TOKEN }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

**v2 Configuration:**
```yaml
permissions:
  id-token: write  # Add this permission

steps:
  - uses: patzick/explore-openapi-snapshot@v2
    with:
      schema-file: './openapi.json'
      project: 'my-project'
```

**Changes:**
1. Remove `auth-token` (OIDC replaces it)
2. Remove `github-token` (not needed)
3. Remove `permanent` if present (backend handles retention)
4. Add `id-token: write` permission
5. Remove `pull-requests: write` permission
6. Remove `API_AUTH_TOKEN` secret (no longer needed)
7. Install the [GitHub App](https://github.com/apps/explore-openapi/installations/new)

### Scenario 2: With Permanent Flag

If you were using the `permanent` flag in v1:

**v1 Configuration:**
```yaml
- uses: patzick/explore-openapi-snapshot@v1
  with:
    schema-file: './openapi.json'
    project: 'my-project'
    auth-token: ${{ secrets.API_AUTH_TOKEN }}
    permanent: 'true'  # ❌ Removed in v2
```

**v2 Configuration:**
```yaml
permissions:
  id-token: write

steps:
  - uses: patzick/explore-openapi-snapshot@v2
    with:
      schema-file: './openapi.json'
      project: 'my-project'
      # No permanent flag needed - backend handles it automatically
```

**Changes:**
- Remove `permanent` flag - retention is now automatic based on context (PR vs branch/tag)

### Scenario 3: Custom Snapshot Names

Custom snapshot names work the same way:

**v1 & v2 (No Change):**
```yaml
- uses: patzick/explore-openapi-snapshot@v2
  with:
    schema-file: './openapi.json'
    project: 'my-project'
    snapshot-name: 'v2.1.0-beta'  # ✅ Still works
```

### Scenario 4: Multiple Schemas

Multiple schemas work the same way:

**v1 & v2 (No Change):**
```yaml
- name: Public API
  uses: patzick/explore-openapi-snapshot@v2
  with:
    schema-file: './public-api.json'
    project: 'my-project-public'

- name: Internal API
  uses: patzick/explore-openapi-snapshot@v2
  with:
    schema-file: './internal-api.json'
    project: 'my-project-internal'
```

## Breaking Changes Summary

### Removed Inputs

| Input | Status | Migration |
|-------|--------|-----------|
| `auth-token` | ❌ Removed | Use OIDC (automatic), remove secrets |
| `github-token` | ❌ Removed | GitHub App handles comments, remove this input |
| `permanent` | ❌ Removed | Backend handles retention automatically |

### Required Changes

1. **Install GitHub App**: [Install here](https://github.com/apps/explore-openapi/installations/new)
2. **Add `id-token: write` permission**: Required for OIDC
3. **Remove deprecated inputs**: Clean up your workflow
4. **Update action version**: Change `@v1` to `@v2`

### Optional Changes

1. **Remove `API_AUTH_TOKEN` secret**: No longer needed (cleanup)

## Troubleshooting

### "Failed to obtain OIDC token"

**Problem**: Missing `id-token: write` permission.

**Solution**:
```yaml
permissions:
  id-token: write
```

### PR Comments Not Appearing

**Problem**: GitHub App not installed.

**Solution**: [Install the Explore OpenAPI GitHub App](https://github.com/apps/explore-openapi/installations/new)

### "Invalid project" Error

**Problem**: Project not configured for OIDC authentication.

**Solution**: Contact the Explore OpenAPI team to enable OIDC for your project.

### Fork PRs Not Working

**Problem**: This should work automatically in v2!

**Verification**:
1. Ensure GitHub App is installed
2. Ensure `id-token: write` permission is set
3. Check that the workflow runs on `pull_request` events

## Benefits of Migrating

### Security

- ✅ No long-lived secrets to manage
- ✅ Short-lived OIDC tokens (automatic rotation)
- ✅ Minimal permissions required
- ✅ GitHub's native trust mechanism

### Simplicity

- ✅ Fewer inputs to configure
- ✅ No secrets to store
- ✅ Cleaner workflow files
- ✅ Less maintenance overhead

### Functionality

- ✅ Works with fork PRs (external contributors)
- ✅ Consistent PR comments via GitHub App
- ✅ Better error messages
- ✅ More reliable authentication

## Need Help?

- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/patzick/explore-openapi-snapshot/issues)
- 💬 [Ask Questions](https://github.com/patzick/explore-openapi-snapshot/discussions)

## Quick Migration Checklist

- [ ] Install [Explore OpenAPI GitHub App](https://github.com/apps/explore-openapi/installations/new)
- [ ] Update action version from `@v1` to `@v2`
- [ ] Remove `auth-token` input
- [ ] Remove `github-token` input
- [ ] Remove `permanent` input (if present)
- [ ] Add `id-token: write` permission
- [ ] Remove `pull-requests: write` permission
- [ ] Remove `API_AUTH_TOKEN` secret (optional cleanup)
- [ ] Test with a PR to verify everything works
- [ ] Test with a fork PR to verify external contributor support

---

**Ready to migrate?** Start with [installing the GitHub App](https://github.com/apps/explore-openapi/installations/new)! 🚀

