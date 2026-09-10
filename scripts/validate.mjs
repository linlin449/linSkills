import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, "skills");
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const errors = [];

let entries = [];
try {
  entries = await fs.readdir(SKILLS, { withFileTypes: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
  const folder = entry.name;
  const skillPath = path.join(SKILLS, folder, "SKILL.md");
  if (!NAME_PATTERN.test(folder) || folder.length > 64) {
    errors.push(`${folder}: folder name must be lowercase, hyphenated, and at most 64 characters`);
  }

  try {
    const raw = await fs.readFile(skillPath, "utf8");
    const parsed = matter(raw);
    if (parsed.data.name !== folder) errors.push(`${folder}: frontmatter name must equal the folder name`);
    if (typeof parsed.data.description !== "string" || parsed.data.description.trim().length < 20) {
      errors.push(`${folder}: description must explain what the skill does and when it applies`);
    }
    if (/replace-(?:with|me)|\bTODO:/i.test(raw)) errors.push(`${folder}: unresolved placeholder text found`);
  } catch (error) {
    errors.push(`${folder}: cannot read SKILL.md (${error.message})`);
  }
}

if (errors.length) {
  console.error(`Validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Validated ${entries.filter((entry) => entry.isDirectory()).length} skill(s).`);
