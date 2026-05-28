.PHONY: setup dev check test validate build smoke stop-dev

setup:
	pnpm run setup

dev:
	pnpm dev

check:
	pnpm lint && pnpm typecheck

test:
	pnpm test

validate:
	pnpm validate

build:
	pnpm build

smoke:
	pnpm test:smoke

stop-dev:
	pkill -f "vite.*mangrove" || true
