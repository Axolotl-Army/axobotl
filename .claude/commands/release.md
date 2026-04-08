---
description: Create a version tag and GitHub release with -alpha suffix
scope: project
allowed-tools: Bash(git:*), Bash(gh:*), AskUserQuestion
argument-hint: <version, e.g. 1.4.0>
---

# Release -- Tag and Publish

## Context
- Current branch: !`git branch --show-current`
- Latest tag: !`git tag --sort=-v:refname | head -1`
- Recent commits since last tag: !`git log --oneline $(git tag --sort=-v:refname | head -1)..HEAD 2>/dev/null | head -15`

## Steps

### 1. Determine version

If $ARGUMENTS is provided, use it as the version (strip leading 'v' if present, will be re-added).

If no argument:
- Check the latest tag
- Analyze commits since that tag to suggest next version:
  - feat commits -> minor bump
  - fix-only -> patch bump
  - breaking (feat!/fix!) -> major bump
- Ask the user to confirm

### 2. Validate

- Version must be valid semver (X.Y.Z)
- Tag `v<version>` must not already exist
- Must be on `main` branch (tags should be on main after the PR is merged)

If not on main, warn: "Version tags should be created on main after the PR is merged. Switch to main first?"

### 3. Create tag

```bash
git tag -a "v<version>" -m "v<version>"
git push origin "v<version>"
```

### 4. Build release notes

Generate a brief list of changes since the previous tag:

```bash
git log --oneline <previous-tag>..v<version>
```

Format as a bullet list grouped by type. Keep it brief -- describe the changes, not the reasoning.
Do NOT include AI attribution.

### 5. Create GitHub release

```bash
gh release create "v<version>" --title "v<version>-alpha" --notes "<release-notes>"
```

The title uses the `-alpha` suffix. The tag itself is `v<version>` (no alpha suffix on the tag, since CI semver matching expects clean `v*` tags).

### 6. Report

- "Release `v<version>-alpha` created."
- Link to the release page
- "CI will build Docker images tagged `<version>` and `latest`."
