#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const DEFAULT_DEV_PORT = "5177";
const DEFAULT_BRANCH = "main";

function gitBranch() {
  const result = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });

  return result.status === 0 ? result.stdout.trim() : "";
}

function hashPort(branch) {
  let hash = 0;
  for (const char of branch) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  }

  return String(5200 + hash);
}

function resolveDevPort(branch) {
  if (process.env["MANGROVE_DEV_PORT"]) {
    return process.env["MANGROVE_DEV_PORT"];
  }

  if (branch === DEFAULT_BRANCH) {
    return DEFAULT_DEV_PORT;
  }

  return hashPort(branch || "detached");
}

const branch = gitBranch();
const port = resolveDevPort(branch);

if (process.argv.includes("--print")) {
  console.log(`branch=${branch || "detached"}`);
  console.log(`MANGROVE_DEV_PORT=${port}`);
  process.exit(0);
}

const child = spawnSync("pnpm", ["dev", ...process.argv.slice(2)], {
  env: {
    ...process.env,
    MANGROVE_DEV_PORT: port
  },
  stdio: "inherit"
});

process.exit(child.status ?? 1);
