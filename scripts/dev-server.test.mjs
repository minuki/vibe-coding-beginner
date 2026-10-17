import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import vm from "node:vm";
import { createDevServer } from "./dev-server.mjs";

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
}

test("preview serves live files, injects reload, and proxies methods, headers, and queries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mentoring-preview-"));
  const backend = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    response.writeHead(201, { "content-type": "application/json" });
    response.end(JSON.stringify({
      method: request.method, url: request.url, token: request.headers.authorization, body,
    }));
  });
  const upstream = await listen(backend);
  const preview = createDevServer({ root, upstreams: { api: upstream, auth: upstream, knowledge: upstream } });
  const base = await listen(preview);
  try {
    await writeFile(path.join(root, "index.html"), "<html><body>First screen</body></html>");
    await writeFile(path.join(root, "styles.css"), "body { margin: 0; }");
    const page = await fetch(base);
    assert.equal(page.headers.get("cache-control"), "no-store");
    assert.match(await page.text(), /First screen.*data-version="[a-f0-9]+"/s);
    const first = await (await fetch(`${base}/__workshop/version`)).json();
    await writeFile(path.join(root, "styles.css"), "body { margin: 8px; }");
    const second = await (await fetch(`${base}/__workshop/version`)).json();
    assert.notEqual(first.version, second.version);
    assert.match(await (await fetch(`${base}/styles.css`)).text(), /margin: 8px/);
    assert.match(await (await fetch(`${base}/__workshop/live.js`)).text(), /window.location.reload/);
    for (const service of ["api", "auth", "knowledge"]) {
      const proxied = await fetch(`${base}/${service}/search?q=hello`, {
        method: "POST", headers: { authorization: "Bearer test", "content-type": "application/json" },
        body: '{"goal":"demo"}',
      });
      assert.equal(proxied.status, 201);
      assert.deepEqual(await proxied.json(), {
        method: "POST", url: "/search?q=hello", token: "Bearer test", body: '{"goal":"demo"}',
      });
    }
    assert.equal((await fetch(`${base}/missing.css`)).status, 404);
    assert.equal((await fetch(`${base}/.env`)).status, 403);
    assert.equal((await fetch(`${base}/%2e%2e%5csecret`)).status, 403);
    assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
  } finally {
    await close(preview);
    await close(backend);
    await rm(root, { recursive: true });
  }
});

test("browser reloads only after a changed version is stable, and reports disconnection", async () => {
  const script = await readFile(new URL("./live-reload.js", import.meta.url), "utf8");
  let tick;
  let reloads = 0;
  let currentVersion = "original";
  let disconnected = false;
  const status = { style: {}, setAttribute() {} };
  const errors = [];
  vm.runInNewContext(script, {
    document: {
      currentScript: { dataset: { version: "original" } },
      createElement: () => status,
      body: { append() {} },
    },
    window: {
      setInterval: (callback) => { tick = callback; },
      location: { reload: () => { reloads++; } },
    },
    fetch: async () => {
      if (disconnected) throw new Error("offline");
      return { ok: true, json: async () => ({ version: currentVersion }) };
    },
    console: { error: (...args) => errors.push(args) },
  });
  await tick();
  assert.equal(reloads, 0);
  currentVersion = "changed";
  await tick();
  assert.equal(reloads, 0);
  await tick();
  assert.equal(reloads, 1);
  disconnected = true;
  await tick();
  assert.match(status.textContent, /연결 끊김/);
  assert.equal(errors.length, 1);
});
