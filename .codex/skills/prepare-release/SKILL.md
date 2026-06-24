---
name: prepare-release
description: Use when preparing a release PR for this GitHub Action by updating CHANGELOG.md, bumping package.json, rebuilding dist, and relying on the GitHub release workflow after merge.
---

# Prepare Release

Run the repo helper on a release branch:

```bash
pnpm prepare-release
```

Workflow:

1. Run `pnpm prepare-release`.
2. Review and edit `CHANGELOG.md`; keep release notes user-facing.
3. Commit `CHANGELOG.md`, `package.json`, `pnpm-lock.yaml`, and any rebuilt `dist/` files.
4. Open a PR to `main`.
5. After merge, `.github/workflows/release.yml` waits for CI success, creates `vX.Y.Z`, moves `vX`, and creates the GitHub Release from that changelog section.

Do not manually create release tags or GitHub Releases unless the workflow fails and the user explicitly asks for manual recovery.
