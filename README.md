# Mangrove

Mangrove is a browser strategy game prototype for learning software engineering concepts through wave-defense play.

## Setup

Required tools:

- Node `22.14.0`
- pnpm `10.26.2`

Install dependencies:

```bash
make setup
```

Start the browser app:

```bash
make dev
```

Default local URL on `main`: `http://127.0.0.1:5177`

For parallel worktrees, `make dev` assigns a stable branch port automatically.
Use `MANGROVE_DEV_PORT` only when you need to override it:

```bash
MANGROVE_DEV_PORT=5178 make dev
```

## Validation

```bash
make check
make test
make smoke
make validate
```

`make validate` runs lint, type-check, unit tests, Knip, dependency audit, and production build.

## Project Structure

```text
src/app/      React shell, HUD placeholders, diagnostics, recap shell
src/game/     Phaser scenes, render adapter, sprite placeholders
src/sim/      Pure deterministic simulator shell
src/content/  Content schemas and first-playable placeholders
src/assets/   Starter sprites, atlases, and generated art placeholders
src/tests/    Simulator, content, boundary, and smoke tests
```

## Environment

`.env.example` documents public Vite flags only. It contains no real credentials.

## Current Scope

Bootstrap creates the runnable app shape and tooling. Gameplay behavior starts from `planning/roadmap/tasks.md`.

GitHub repository settings are documented in `docs/github-settings.md` because this local repository has no remote yet.

License: MIT.
