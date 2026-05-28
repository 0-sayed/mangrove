# Mangrove Agent Instructions

## Guardrails

- Do not commit or push unless the user explicitly asks.
- Do not use destructive git commands (`restore`, `revert`, `reset`, `clean`, `checkout --`, force push) unless explicitly approved.
- Keep bootstrap work separate from gameplay tasks in `planning/roadmap/tasks.md`.
- Prefer the smallest verified change that satisfies the current task.

## Project Shape

- Browser app: React + Vite + TypeScript.
- Game renderer: Phaser 3 in `src/game/`.
- Game rules: pure TypeScript simulator in `src/sim/`.
- Content contracts: runtime schemas in `src/content/`.
- App shell/HUD/diagnostics: React in `src/app/`.
- Tests: `src/tests/`.

## Architecture Rules

- `src/sim/` must not import React, Phaser, browser APIs, timers, or rendering modules.
- React and Phaser render simulator snapshots; they do not own game truth.
- No gameplay behavior belongs in `bootstrap.md`. First playable work starts from `planning/roadmap/tasks.md`.
- Use deterministic inputs for simulator work. Do not use `Math.random` or `Date.now` in gameplay logic.

## Commands

- `make setup` installs dependencies.
- `make dev` starts Vite on the documented default port.
- `make check` runs lint and type-check.
- `make test` runs Vitest.
- `make smoke` runs the browser smoke test.
- `make validate` runs lint, type-check, unit tests, knip, audit, and build.
- `make stop-dev` stops stale Vite processes if a local run gets stuck.

## Local Development

- Default dev URL: `http://127.0.0.1:5177`.
- Override dev port per worktree with `MANGROVE_DEV_PORT`.
- Override preview port per worktree with `MANGROVE_PREVIEW_PORT`.
- Public Vite flags live in `.env.example`; use fake values only.

## Testing

- Add simulator/content tests before implementing new game rules.
- Keep browser smoke tests focused on loading, visible HUD/canvas, and blocking console errors.
- Keep test doubles typed enough to avoid hiding behavior behind `any`.

## Security

- `.env`, keys, certificates, and `secrets/` must stay ignored.
- `lefthook.yml` runs `gitleaks protect --staged --redact`; install `gitleaks` locally before relying on the hook.
- If a global `core.hooksPath` exists, repo hook installation is skipped to preserve machine policy.
