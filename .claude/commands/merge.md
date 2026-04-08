---
description: Promote development changes to a PR against main
scope: project
allowed-tools: Bash(git:*), Bash(gh:*), AskUserQuestion
argument-hint: [optional branch name, e.g. feat/add-xp-command]
---

# Merge -- Promote Development to PR

## Context
- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Commits ahead of main: !`git rev-list --count origin/main..development 2>/dev/null || echo "0"`
- Recent development commits: !`git log --oneline origin/main..development 2>/dev/null | head -20`

## Pre-flight Checks

### 1. Must be on `development`

```bash
git branch --show-current
```

If NOT on `development`: warn the user and ask if they want to switch. Do NOT proceed from `main` or any other branch.

### 2. Check for uncommitted changes

```bash
git status --porcelain
```

If dirty: ask the user to commit or stash first. Do NOT proceed with uncommitted work.

### 3. Check that development is ahead of main

```bash
git rev-list --count origin/main..development
```

If the count is 0: report "Nothing to merge -- development is up to date with main." and stop.

### 4. Sync check -- ensure development has latest main

```bash
git fetch origin main
git merge-base --is-ancestor origin/main development
```

If origin/main is NOT an ancestor of development: warn that development is behind main. Offer to merge main into development first:

```bash
git merge origin/main --no-edit
```

## Create Feature Branch

### 5. Determine branch name

If the user provided a branch name via $ARGUMENTS, use it.

Otherwise, analyze the commits between main and development:

```bash
git log --oneline origin/main..development
```

Suggest a descriptive branch name using conventional prefixes:
- `feat/` for new features
- `fix/` for bug fixes
- `chore/` for maintenance
- `refactor/` for refactoring

Ask the user to confirm or override the suggested name.

### 6. Create the branch from development

```bash
git checkout -b <branch-name>
git push -u origin <branch-name>
```

## Create Pull Request

### 7. Build PR description

Analyze the commits being promoted:

```bash
git log --oneline origin/main..<branch-name>
```

Create a concise PR with:
- Title: short summary of the changes (under 70 chars)
- Body: bulleted list of changes grouped by type (features, fixes, chores)

Do NOT include project-docs/ changes in the PR description.
Do NOT include AI attribution in the PR.

```bash
gh pr create --base main --head <branch-name> --title "<title>" --body "<body>"
```

### 8. Return to development

```bash
git checkout development
```

### 9. Report

Display:
- PR URL
- Branch name
- Number of commits included
- Docker dev image info: "CI will build `ghcr.io/axolotl-army/axobotl-bot:dev` and `ghcr.io/axolotl-army/axobotl-dashboard:dev` -- pull them on your test machine when the action completes."

### 10. Ask about version tag

Ask: "Do you want to create a version tag for this release?"

If yes:
- Check the latest tag: `git tag --sort=-v:refname | head -1`
- Suggest the next semver version based on the changes:
  - feat commits -> minor bump
  - fix-only commits -> patch bump
  - breaking changes (feat! or fix!) -> major bump
- Report the suggestion and let the user confirm
- Tell them to run `/release <version>` after the PR is merged
