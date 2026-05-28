import { execFileSync } from "node:child_process";

function readGitConfig(args) {
  try {
    return execFileSync("git", ["config", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

const localHooksPath = readGitConfig(["--local", "--get", "core.hooksPath"]);
const globalHooksPath = readGitConfig(["--global", "--get", "core.hooksPath"]);
const hooksPath = localHooksPath || globalHooksPath;

if (hooksPath) {
  console.log(`Skipping lefthook install because core.hooksPath is managed at ${hooksPath}.`);
  process.exit(0);
}

execFileSync("lefthook", ["install"], { stdio: "inherit" });
