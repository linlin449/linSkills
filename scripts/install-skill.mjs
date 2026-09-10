import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, "skills");
const args = process.argv.slice(2);
const installAll = args.includes("--all");
const force = args.includes("--force");
const targetIndex = args.indexOf("--target");
const targetRoot = path.resolve(targetIndex >= 0 ? args[targetIndex + 1] : path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills"));
const requested = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--target");

if (!installAll && !requested) {
  console.error("Usage: node scripts/install-skill.mjs <skill-name> [--target PATH] [--force]\n       node scripts/install-skill.mjs --all [--target PATH] [--force]");
  process.exit(1);
}

const available = (await fs.readdir(SKILLS, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const names = installAll ? available : [requested];

for (const name of names) {
  if (!available.includes(name)) {
    console.error(`Unknown skill: ${name}. Available: ${available.join(", ")}`);
    process.exitCode = 1;
    continue;
  }

  const source = path.join(SKILLS, name);
  const destination = path.join(targetRoot, name);
  try {
    await fs.access(destination);
    if (!force) {
      console.error(`${name}: target exists at ${destination}; use --force to back it up and replace it`);
      process.exitCode = 1;
      continue;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = `${destination}.backup-${stamp}`;
    await fs.rename(destination, backup);
    console.log(`${name}: backed up existing version to ${backup}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await fs.mkdir(targetRoot, { recursive: true });
  await fs.cp(source, destination, { recursive: true });
  console.log(`${name}: installed to ${destination}`);
}
