import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

marked.setOptions({ gfm: true, breaks: false });

const toPosix = (value) => value.split(path.sep).join("/");
const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

async function walk(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(fullPath) : [fullPath];
    }));
    return files.flat();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function firstHeading(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function firstParagraph(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n\s*\n/)
    .map((block) => block.replace(/^#+\s+/gm, "").replace(/[>*_`\[\]()#-]/g, " ").replace(/\s+/g, " ").trim())
    .find((block) => block.length > 30) || "";
}

function itemId(type, relativePath) {
  const stem = relativePath.replace(/\/SKILL\.md$/i, "").replace(/\.md$/i, "");
  return `${type}:${stem}`;
}

function safeFileName(id) {
  return `${Buffer.from(id).toString("base64url")}.json`;
}

function rewriteRelativeUrl(url, rawBase) {
  if (!url || /^(?:[a-z]+:|#|\/)/i.test(url)) return url;
  return `${rawBase}/${url}`.replace(/\/\.\//g, "/");
}

function renderMarkdown(markdown, rawBase) {
  const unsafe = marked.parse(markdown);
  return sanitizeHtml(unsafe, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "details", "summary"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "loading"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          href: rewriteRelativeUrl(attribs.href, rawBase),
          ...(attribs.href?.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})
        }
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, src: rewriteRelativeUrl(attribs.src, rawBase), loading: "lazy" }
      })
    }
  });
}

async function readItem(type, absolutePath, baseDirectory) {
  const relativePath = toPosix(path.relative(baseDirectory, absolutePath));
  const sourcePath = toPosix(path.relative(ROOT, absolutePath));
  const rawBase = `raw/${toPosix(path.dirname(sourcePath))}`;
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = matter(raw);
  const metadata = parsed.data || {};
  const tags = metadata.tags || metadata.metadata?.tags || [];
  const title = metadata.title || metadata.name || firstHeading(parsed.content) || path.basename(absolutePath, ".md");
  const description = metadata.description || firstParagraph(parsed.content).slice(0, 220);
  const id = itemId(type, relativePath);

  return {
    id,
    type,
    title,
    description,
    tags: Array.isArray(tags) ? tags.map(String) : [String(tags)],
    updated: normalizeDate(metadata.updated || metadata.metadata?.updated),
    status: metadata.status || "active",
    sourcePath,
    rawUrl: `raw/${sourcePath}`,
    contentUrl: `content/${safeFileName(id)}`,
    searchText: parsed.content.replace(/```[\s\S]*?```/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim(),
    markdown: raw,
    html: renderMarkdown(parsed.content, rawBase)
  };
}

async function build() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
  await fs.cp(path.join(ROOT, "site"), DIST, { recursive: true });

  const skillRoot = path.join(ROOT, "skills");
  const knowledgeRoot = path.join(ROOT, "knowledge");
  const skillFiles = (await walk(skillRoot)).filter((file) => path.basename(file).toLowerCase() === "skill.md");
  const knowledgeFiles = (await walk(knowledgeRoot)).filter((file) => file.toLowerCase().endsWith(".md"));

  const items = [
    ...(await Promise.all(skillFiles.map((file) => readItem("skill", file, skillRoot)))),
    ...(await Promise.all(knowledgeFiles.map((file) => readItem("knowledge", file, knowledgeRoot))))
  ].sort((a, b) => (b.updated || "").localeCompare(a.updated || "") || a.title.localeCompare(b.title));

  await fs.mkdir(path.join(DIST, "content"), { recursive: true });
  await fs.mkdir(path.join(DIST, "raw"), { recursive: true });
  await fs.cp(skillRoot, path.join(DIST, "raw", "skills"), { recursive: true });
  await fs.cp(knowledgeRoot, path.join(DIST, "raw", "knowledge"), { recursive: true });

  await Promise.all(items.map((item) => fs.writeFile(
    path.join(DIST, item.contentUrl),
    JSON.stringify(item, null, 2),
    "utf8"
  )));

  const catalog = items.map(({ markdown, html, ...item }) => item);
  await fs.writeFile(path.join(DIST, "catalog.json"), JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    items: catalog
  }, null, 2));

  const llmsIndex = [
    "# Personal Knowledge Base",
    "",
    "> Canonical skills and personal reference notes. Use the catalog to discover content, then read the linked raw Markdown.",
    "",
    ...catalog.map((item) => `- [${item.title}](${item.rawUrl}): ${item.description}`)
  ].join("\n");
  await fs.writeFile(path.join(DIST, "llms.txt"), `${llmsIndex}\n`);

  const llmsFull = items.map((item) => [
    `# ${item.title}`,
    `Source: ${item.rawUrl}`,
    `Type: ${item.type}`,
    "",
    item.markdown
  ].join("\n")).join("\n\n---\n\n");
  await fs.writeFile(path.join(DIST, "llms-full.txt"), `${llmsFull}\n`);
  await fs.writeFile(path.join(DIST, ".nojekyll"), "");

  console.log(`Built ${items.length} items (${skillFiles.length} skills, ${knowledgeFiles.length} notes) into dist/.`);
}

await build();
