# Project Bootstrap Checklist

This file is the bridge between planning and the first game feature implementation.

Flow:

```text
planning/ -> bootstrap.md -> planning/roadmap/tasks.md
```

`planning/` defines the product shape, architecture choices, and roadmap context.

Expected planning shape, using `planning/` as the default folder name:

```text
planning/
  context/
  roadmap/
    tasks.md
```

`planning/roadmap/tasks.md` is the feature roadmap. It should be DAG-like: one row per task, with dependencies and context references, so agents can pick the next unblocked task.

Example task row:

| Task                                       | Depends On | Context                                                        |
| ------------------------------------------ | ---------- | -------------------------------------------------------------- |
| [ ] `T001` — Define first playable schemas | —          | `planning/context/game-design.md`, `planning/context/stack.md` |

Bootstrap may create an empty browser game app, runtime shells, test scaffolding, and developer tooling, but it must not implement gameplay behavior.

## Phase 1 — Generic Foundation

These steps do not need business context.

### Step 1 — Repository Foundation

> **This is the initial commit.** Static files. No dependencies. Do them before any code exists. `README.md`, `LICENSE`, and `.gitignore` are the universal trinity — every project starts with these three, no exceptions. The remaining files lock in editor consistency and security reporting.
>
> Commit message: `chore: initialize repository foundation`

- [x] `git init`
- [x] `README.md` — first commit only: project name, one-sentence description, license.
- [x] `.gitignore` (use [gitignore.io](https://gitignore.io) for your stack, verify `.env` excluded)
- [x] `LICENSE` (choose once, apply everywhere)
- [x] `.editorconfig` (indent style, line endings, trailing whitespace)
- [x] `planning/`

---

### Step 2 — Runtime & Language Config

> Everything downstream inherits these settings. Changing tsconfig paths later is a codebase-wide rewrite.

- [ ] `.nvmrc` or `.node-version` (pin exact version)
- [ ] `package.json` with `engines` field (enforce Node + package manager version)
- [ ] `pnpm-workspace.yaml` (if monorepo)
- [ ] `tsconfig.json` (`strict: true` — enables 8 flags including `strictNullChecks`, `strictFunctionTypes`, `useUnknownInCatchVariables`; critical for agentic development where 94% of LLM-generated compilation errors are type-check failures, path aliases)
  - **Beyond strict** — 5 additional flags with high value and low friction: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `isolatedModules`
  - **Skip** `noPropertyAccessFromIndexSignature` — creates `process.env['X']` bracket-notation noise across the codebase with zero bug-catching benefit. `noUncheckedIndexedAccess` already covers the safety case.
- [ ] `tsconfig.build.json` (exclude tests, dev files)

---

### Step 3 — Workspace Tooling

- [ ] Initialize package/workspace tooling for the chosen project shape. For monorepos, start with pnpm workspaces; add Nx/Turborepo only when app/lib graph, caching, generators, or affected builds are needed.
  - Small monorepo: pnpm workspaces
  - Serious multi-service/product monorepo: pnpm workspaces + Nx tooling
  - Huge app with many packages: Nx or Turborepo
  - Stop at workspace tooling and root configuration here. Do not generate framework apps, gameplay systems, content schemas, Phaser scenes, simulator systems, or feature libraries in the generic foundation phase.

---

### Step 4 — Code Quality Gates

> Every file written from this point forward is auto-formatted and linted. Zero formatting noise in PRs.

- [ ] ESLint (flat config, TS-aware)
  - Use `strictTypeChecked` + `stylisticTypeChecked` (not just `recommendedTypeChecked`) — the 80/20 for TypeScript linting.
  - `no-explicit-any: error` — blocks `any` from CI.
  - `no-unsafe-type-assertion: warn` (not error) — surfaces unsafe casts in editor + PR review without forcing `eslint-disable` comments or `as unknown as` double-casts at framework boundaries. At error level it generates ~80% noise for ~10% extra safety.
  - Add `**/*.config.ts` to ignores — config files are execution roots, not library code.
  - **Test file overrides** — relax `@typescript-eslint/no-unsafe-*` rules for every configured test suffix, such as `*.spec.ts`, `*.test.ts`, `*.integration-spec.ts`, and `*.e2e-spec.ts`. Mock objects are inherently `any`-typed; enforcing type safety on test doubles adds boilerplate with no safety gain. Configure via ESLint `files` override, not per-file disable comments.
- [ ] Prettier (`.prettierrc` + `.prettierignore`)
- [ ] Knip (dead code / unused deps detection)

---

### Step 5 — Automated CI Setup

- [ ] GitHub Actions workflow (`ci.yml`): lint → type-check → build
- [ ] PR validation workflow (`pr-check.yml`): conventional commit title enforcement, dependency review, merge conflict detection
- [ ] Auto-assign PR author workflow (`auto-assign-pr.yml`): assigns the PR to its author on open. If the workflow writes PR metadata, use the correct GitHub event and permissions for that write path, and do not check out or execute untrusted PR code.
- [ ] CI permissions: least-privilege (`contents: read` by default; add only the write permissions a workflow actually needs)
- [ ] Dependabot for GitHub Actions (`.github/dependabot.yml` — `github-actions` ecosystem; professional default is weekly, individual side-project choice is monthly to reduce noise). If the project should also receive package dependency PRs, add the package ecosystem explicitly with the same noise policy.

---

### Step 6 — Manual GitHub Repository Settings

- [ ] Branch protection on `main` — GitHub UI → Settings → Branches → `main`:
  - Rule name: `Protect main`
  - Add target → Include default branch
  - Restrict deletions
  - Require a pull request before merging (0 approvals for solo)
  - Require status checks to pass for the checks that exist now: `Lint`, `Type Check`, `Build`
  - Block force pushes
- [ ] Auto-delete head branches — GitHub UI → Settings → General → Pull Requests → check "Automatically delete head branches"

## Phase 2 — Game Project Shape Foundation

These steps depend on the planning folder created in Step 1. They may create app/runtime/source boundaries, but still must not implement feature behavior.

### Step 7 — Game App Skeleton From Planning

> Read the planning folder, identify the initial browser game boundaries, then create them. The goal is a runnable project shape, not working gameplay behavior.

- [ ] Confirm the planning folder names the initial app/runtime boundaries.
- [ ] Confirm the first playable is browser-only and has no external service.
- [ ] Confirm the public entrypoint: Vite browser app.
- [ ] Confirm what is intentionally out of scope for bootstrap.
- [ ] Confirm the first real feature task starts in `tasks.md`, not in this bootstrap checklist.
- [ ] Initialize React + Vite + TypeScript.
- [ ] Install Phaser 3 and wire an empty Phaser scene into the React app shell.
- [ ] Create the initial source layout:
  - `src/app/` — React shell, HUD placeholders, panels, recap shell.
  - `src/game/` — Phaser scenes, render adapter, sprite placeholders.
  - `src/sim/` — deterministic simulator shell.
  - `src/content/` — first playable content placeholders and schema placeholders.
  - `src/assets/` — sprites, atlases, generated art placeholders.
  - `src/tests/` — simulator and content test scaffolding.
- [ ] Add bootstrap entrypoints and empty module shells only.
- [ ] Document bootstrap-level app commands only; do not design gameplay content or feature contracts here.
- [ ] Do not implement waves, buildings, message lifecycle, upgrades, scoring, saves, accounts, multiplayer, or external service behavior.

---

### Step 8 — Local Browser Development

- [ ] `.env.example` only if the Vite app needs documented public flags.
- [ ] Keep environment defaults consistent across `.env.example`, Vite config, package scripts, tests, and CI dummy env.
- [ ] Configure Vite dev and preview ports through package scripts or documented env vars.
- [ ] Use project-specific default ports so this game does not collide with other local apps.
- [ ] Document worktree-safe dev-server usage: each worktree must be able to run Vite on a different port.
- [ ] Document how to stop stale Vite/preview processes from previous runs.
- [ ] Do not add external runtime services during bootstrap.

---

### Step 9 — Game Diagnostics Foundation

- [ ] Add a React error boundary for the app shell.
- [ ] Add a small development-only diagnostics surface for simulator tick, phase, meters, and recent events.
- [ ] Add console-error discipline: development errors should be visible and actionable.
- [ ] Add a minimal simulator event-log utility that can be tested without React or Phaser.
- [ ] Keep diagnostics browser/local only.

---

### Step 10 — Testing Foundation

> Agent note: before implementing this step, check the current official docs for Vitest, Vite, React testing guidance if needed, Phaser testing constraints, and Playwright. Keep the first tests focused on deterministic simulator behavior and content validation.

- [ ] Vitest config for simulator, content, and boundary tests.
- [ ] One exemplary simulator unit test for pure game-rule logic.
- [ ] One exemplary content schema validation test.
- [ ] One exemplary sim-boundary test that prevents React and Phaser imports inside `src/sim/`.
- [ ] Add Playwright only when browser smoke testing starts.
- [ ] Browser smoke test target, when added: app loads, canvas is nonblank, HUD is visible, no console errors block the first screen.
- [ ] Coverage via `@vitest/coverage-v8` (start at 50%, increase over time)
- [ ] Project-level build targets pass for the Vite app and TypeScript project.
- [ ] `pnpm validate` script = lint + type-check + test + knip + audit + build

---

### Step 11 — Developer Experience

- [ ] `AGENTS.md` — Codex agent instructions for this repo. Check current official Codex guidance for instruction-file conventions, then inspect this repo's scripts, app/source layout, env files, tests, and bootstrap decisions. Include how to run dev, validation commands, test conventions, banned behaviors, architecture map, simulator/rendering boundaries, browser/dev-server gotchas, and common workflows. Keep it concise and less than 200 lines.
- [ ] Verify every command documented in `AGENTS.md` exists in the Makefile, package scripts, or the repo's chosen task runner.
- [ ] `Makefile` or task runner — expose core developer workflows, not every package script. Add memorable commands a developer actually uses, such as `make setup`, `make dev`, `make check`, `make test`, and `make validate`. Only include commands that are wired to real repo behavior.

---

### Step 12 — Security Baseline

- [ ] **`.gitignore` audit:** Verify `.env`, `*.pem`, `*.key`, `*.p12`, `secrets/` are excluded. Run `git status` on a clean checkout — nothing sensitive should appear.
- [ ] **Environment variable hygiene:** `.env.example` documents every variable with comments, uses obviously fake placeholders (`changeme`, `fake-value`, empty string), and contains no real credentials. CI workflow files must use dummy values only and must not print secrets.
- [ ] **Dependency license policy:** Deny GPL-3.0 and AGPL-3.0 via `actions/dependency-review-action` in `pr-check.yml`. Keep vulnerability auditing in the full CI pipeline step, not here.
- [ ] **Pre-commit secret scanning:** Blocks secrets from entering git history.
  - Install [gitleaks](https://github.com/gitleaks/gitleaks/releases) on each dev machine (one-time).
  - Add `lefthook` to the repo (`pnpm add -Dw lefthook`) with a `pre-commit` job running `gitleaks protect --staged --redact`.
  - Wire hook installation through `package.json` so every dev gets the hook on `pnpm install`, while preserving any existing global hook policy.

---

### Step 13 — Full CI Pipeline

- [ ] Add test job to CI workflow for the test layers that exist locally: simulator tests, content tests, boundary tests, and later browser smoke tests.
- [ ] Run browser smoke tests in CI only after Playwright is added.
- [ ] Add CI caching where useful (package manager store, build-tool cache, lint cache if enabled, TypeScript incremental cache if enabled)
- [ ] Concurrency groups (cancel stale runs on same branch)
- [ ] Timeout limits per job (prevent runaway builds)
- [ ] `pnpm audit` in CI (own job — `Security Audit` — runs parallel to lint/typecheck/test)

---

### Step 13.1 — Branch Protection Update

- [ ] Add `Test` to required branch protection: GitHub repo → Settings → Branches → `Protect main` → Require status checks → Add checks → `Test` → Save changes.

---

### Step 14 — Post-Bootstrap Audit

> Agents generate files with stale dependency versions (LLM training cutoff) and hallucinated GitHub Actions SHAs. This step fixes both, then validates everything in one pass.

- [ ] `pnpm update -r --latest` (update all workspace package.json to latest versions)
- [ ] `pnpm install` (regenerate lockfile after version bumps)
- [ ] Pin GitHub Actions to SHA — **never write SHAs by hand; AI models hallucinate them.** Use [pinact](https://github.com/suzuki-shunsuke/pinact) to resolve and verify:

  ```bash
  # Install or refresh pinact to the latest release for this bootstrap run
  curl -sL https://github.com/suzuki-shunsuke/pinact/releases/latest/download/pinact_linux_amd64.tar.gz \
    | tar -xz -C ~/.local/bin

  pinact --version

  # Write workflows with version tags (@v6), then pin them to real SHAs
  GITHUB_TOKEN=$(gh auth token) pinact run

  # Verify existing SHAs match their version annotations
  GITHUB_TOKEN=$(gh auth token) pinact run -verify

  # Update all actions to latest versions + re-pin
  GITHUB_TOKEN=$(gh auth token) pinact run -update
  ```

  > `GITHUB_TOKEN` is required — without it pinact hits GitHub's unauthenticated rate limit and times out.

- [ ] `pnpm validate` (lint + typecheck + test + knip + audit + build — confirm nothing broke)
- [ ] Update `README.md` — flesh out the placeholder from Step 1: accurate setup steps, final project structure, environment variables, and any gotchas discovered during development.

---

### Step 15 — Local Smoke Test

> Final runtime check before opening the bootstrap PR. This proves the project can actually start, not only compile.

- [ ] Start the Vite dev server using the project's documented command.
- [ ] Confirm the dev server starts on the documented default port.
- [ ] Run the full local validation command.
- [ ] Open the app locally.
- [ ] Confirm the React shell renders.
- [ ] Confirm the Phaser canvas renders and is nonblank.
- [ ] Confirm no console errors block the first screen.
- [ ] Stop the dev server.
- [ ] Confirm no stale Vite/preview process remains.

---

### Step 16 — Codex Review

- [ ] Run Codex `/review` on the bootstrap changes.
- [ ] Fix valid findings or document why they are intentionally not changed.
- [ ] Rerun focused verification for any fixes made after review.

---

### Step 17 — First Pull Request

- [ ] First PR — branch `chore/project-bootstrap`
- [ ] PR title: `chore: bootstrap project`
- [ ] PR description: summarize bootstrap scope, list validation evidence, and note that business behavior is intentionally out of scope.
- [ ] Keep the bootstrap in one PR with clean commits:
  - `chore: configure workspace and quality gates` — runtime/package manager config, package scripts, TypeScript config, workspace metadata, linting, formatting, dead-code checks, CI basics.
  - `chore: bootstrap game runtime` — Vite/React app shell, Phaser scene shell, simulator/content folders, local browser development contract, diagnostics, tests, security baseline, Makefile, agent instructions, final smoke/review fixes.
