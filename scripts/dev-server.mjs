import http from "node:http";
import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const liveScriptPath = new URL("./live-reload.js", import.meta.url);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function version(root) {
  const hash = createHash("sha256");
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile()) {
        hash.update(path.relative(root, filename));
        hash.update(await readFile(filename));
      }
    }
  }
  await visit(root);
  return hash.digest("hex");
}

function send(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  response.end(body);
}

export function createDevServer({ root, upstreams }) {
  const resolvedRoot = path.resolve(root);
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const service = Object.keys(upstreams).find((name) => url.pathname.startsWith(`/${name}/`));
      if (service) {
        const target = new URL(upstreams[service]);
        target.pathname = url.pathname.slice(service.length + 1);
        target.search = url.search;
        const headers = { ...request.headers, host: target.host };
        const upstream = http.request(target, { method: request.method, headers }, (result) => {
          response.writeHead(result.statusCode, { ...result.headers, "cache-control": "no-store" });
          result.pipe(response);
        });
        upstream.setTimeout(10_000, () => upstream.destroy(new Error("Upstream timed out")));
        upstream.on("error", (error) => {
          console.error(`Preview proxy ${service}:`, error.message);
          if (!response.headersSent) {
            send(response, 502, JSON.stringify({ error: `${service} 서비스에 연결하지 못했습니다. 컨테이너 상태를 확인해 주세요.` }), "application/json; charset=utf-8");
          } else response.destroy(error);
        });
        request.pipe(upstream);
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return send(response, 405, "Method not allowed");
      }
      if (url.pathname === "/__workshop/version") {
        return send(response, 200, JSON.stringify({ version: await version(resolvedRoot) }), "application/json; charset=utf-8");
      }
      if (url.pathname === "/__workshop/live.js") {
        return send(response, 200, await readFile(liveScriptPath), mimeTypes[".js"]);
      }
      const segments = decodeURIComponent(url.pathname).replaceAll("\\", "/").split("/");
      if (segments.some((segment) => segment.startsWith(".") || segment.includes("\0"))) {
        return send(response, 403, "Forbidden");
      }
      const filename = await realpath(path.join(resolvedRoot, ...segments, url.pathname.endsWith("/") ? "index.html" : ""));
      const rootPath = await realpath(resolvedRoot);
      const relative = path.relative(rootPath, filename);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return send(response, 403, "Forbidden");
      let content = await readFile(filename);
      const extension = path.extname(filename);
      if (extension === ".html") {
        const script = `<script src="/__workshop/live.js" data-version="${await version(resolvedRoot)}"></script>`;
        const html = content.toString("utf8");
        content = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${script}</body>`) : `${html}${script}`;
      }
      return send(response, 200, content, mimeTypes[extension] || "application/octet-stream");
    } catch (error) {
      if (["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) return send(response, 404, "File not found");
      if (error instanceof URIError) return send(response, 400, "Invalid URL");
      console.error("Preview failed:", error);
      return send(response, 500, "미리보기 파일을 읽지 못했습니다. 서버 로그를 확인해 주세요.");
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 80);
  createDevServer({
    root: process.env.WEB_ROOT || path.resolve("app/web"),
    upstreams: {
      api: process.env.API_URL || "http://api:3000",
      auth: process.env.AUTH_URL || "http://auth:3001",
      knowledge: process.env.KNOWLEDGE_URL || "http://knowledge:3002",
    },
  }).listen(port, "0.0.0.0", () => console.log(`Workshop preview listening on ${port}`));
}
