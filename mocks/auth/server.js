const http = require("node:http");

const users = [
  { id: "mentee-01", email: "mentee@demo.local", password: "demo123", name: "윤지우", role: "mentee" },
  { id: "mentor-01", email: "mentor@demo.local", password: "demo123", name: "김하늘", role: "mentor" },
  { id: "admin-01", email: "admin@demo.local", password: "demo123", name: "운영자", role: "admin" },
];
const tokens = new Map(users.map((user) => [`demo-${user.role}-token`, user]));
const port = Number(process.env.PORT || 3001);

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) reject(new Error("Request body too large"));
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/healthz") {
    return send(response, 200, { status: "ok", mock: true });
  }
  if (request.method === "POST" && url.pathname === "/login") {
    try {
      const { email, password } = await readJson(request);
      const user = users.find((candidate) => candidate.email === email && candidate.password === password);
      if (!user) return send(response, 401, { error: "이메일 또는 비밀번호를 확인해 주세요." });
      const token = `demo-${user.role}-token`;
      return send(response, 200, {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (error) {
      return send(response, 400, { error: error.message });
    }
  }
  if (request.method === "GET" && url.pathname === "/verify") {
    const token = (request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const user = tokens.get(token);
    if (!user) return send(response, 401, { error: "유효하지 않은 실습 로그인입니다." });
    return send(response, 200, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }
  return send(response, 404, { error: "Not found" });
}).listen(port, "0.0.0.0");
