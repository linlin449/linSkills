import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.KB_PORT || 4173);

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(ROOT, "scripts", "build.mjs")], { stdio: "inherit" });
  child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Build exited with code ${code}`)));
});

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(DIST, requested);
  if (!filePath.startsWith(`${DIST}${path.sep}`) && filePath !== path.join(DIST, "index.html")) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Knowledge base ready at http://127.0.0.1:${PORT}`);
});
