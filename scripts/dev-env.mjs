#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_DEV_PORT = "5177";
const DEFAULT_BRANCH = "main";

export function gitBranch() {
  const result = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });

  return result.status === 0 ? result.stdout.trim() : "";
}

export function hashPort(branch) {
  let hash = 0;
  for (const char of branch) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  }

  return String(5200 + hash);
}

export function resolveDevPort(branch) {
  if (process.env["MANGROVE_DEV_PORT"]) {
    return process.env["MANGROVE_DEV_PORT"];
  }

  if (branch === DEFAULT_BRANCH) {
    return DEFAULT_DEV_PORT;
  }

  return hashPort(branch || "detached");
}

export function createDevServerSpawnConfig(
  port,
  argv,
  platform = process.platform
) {
  return {
    command: "pnpm",
    args: ["dev", ...argv],
    options: {
      env: {
        ...process.env,
        MANGROVE_DEV_PORT: port
      },
      stdio: "inherit",
      shell: platform === "win32"
    }
  };
}

export function run(argv = process.argv.slice(2)) {
  const branch = gitBranch();
  const port = resolveDevPort(branch);

  if (argv.includes("--print")) {
    console.log(`branch=${branch || "detached"}`);
    console.log(`MANGROVE_DEV_PORT=${port}`);
    return 0;
  }

  const { command, args, options } = createDevServerSpawnConfig(port, argv);
  const child = spawnSync(command, args, options);

  if (child.error) {
    console.error(`Failed to start dev server: ${child.error.message}`);
    return 1;
  }

  return child.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
