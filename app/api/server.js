const http = require("node:http");
const { Pool } = require("pg");

const port = Number(process.env.PORT || 3000);
const authUrl = process.env.AUTH_URL || "http://localhost:3001";
const pool = new Pool(
  process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : undefined,
);

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) reject(new Error("Request body too large"));
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

async function authenticatedUser(request) {
  const authorization = request.headers.authorization;
  if (!authorization) return null;
  const result = await fetch(`${authUrl}/verify`, {
    headers: { authorization },
    signal: AbortSignal.timeout(3000),
  });
  if (!result.ok) return null;
  return result.json();
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/healthz") {
      await pool.query("SELECT 1");
      return send(response, 200, { status: "ok", mockDatabase: true });
    }

    const user = await authenticatedUser(request);
    if (!user) return send(response, 401, { error: "먼저 로그인해 주세요." });

    if (request.method === "GET" && url.pathname === "/mentors") {
      const result = await pool.query(
        "SELECT id, name, title, topics, bio FROM mentors ORDER BY name",
      );
      return send(response, 200, { mentors: result.rows });
    }

    if (request.method === "GET" && url.pathname === "/applications") {
      if (user.role === "admin") {
        const result = await pool.query(
          `SELECT a.id, a.mentor_id AS "mentorId", m.name AS "mentorName",
                  a.mentee_id AS "menteeId", a.goal, a.status, a.created_at AS "createdAt"
           FROM applications a JOIN mentors m ON m.id = a.mentor_id
           ORDER BY a.created_at DESC`,
        );
        return send(response, 200, { applications: result.rows });
      }
      const result = await pool.query(
        `SELECT a.id, a.mentor_id AS "mentorId", m.name AS "mentorName",
                a.mentee_id AS "menteeId", a.goal, a.status, a.created_at AS "createdAt"
         FROM applications a JOIN mentors m ON m.id = a.mentor_id
         WHERE a.mentee_id = $1 OR a.mentor_id = $2
         ORDER BY a.created_at DESC`,
        [user.id, user.id],
      );
      return send(response, 200, { applications: result.rows });
    }

    if (request.method === "POST" && url.pathname === "/applications") {
      if (user.role !== "mentee") {
        return send(response, 403, { error: "멘티 계정으로 로그인해 신청해 주세요." });
      }
      const { mentorId, goal } = await readJson(request);
      if (typeof mentorId !== "string" || typeof goal !== "string" || !goal.trim() || goal.length > 1000) {
        return send(response, 400, { error: "멘토와 1,000자 이내의 멘토링 목표를 입력해 주세요." });
      }
      const mentor = await pool.query("SELECT 1 FROM mentors WHERE id = $1", [mentorId]);
      if (!mentor.rowCount) return send(response, 404, { error: "멘토를 찾을 수 없습니다." });
      const result = await pool.query(
        `INSERT INTO applications (mentor_id, mentee_id, goal)
         VALUES ($1, $2, $3)
         RETURNING id, mentor_id AS "mentorId", mentee_id AS "menteeId",
                   goal, status, created_at AS "createdAt"`,
        [mentorId, user.id, goal.trim()],
      );
      return send(response, 201, { application: result.rows[0] });
    }

    if (request.method === "PATCH" && /^\/applications\/\d+\/status$/.test(url.pathname)) {
      if (user.role !== "admin") return send(response, 403, { error: "운영자 계정만 상태를 변경할 수 있습니다." });
      const { status } = await readJson(request);
      if (!["accepted", "declined"].includes(status)) {
        return send(response, 400, { error: "상태는 accepted 또는 declined여야 합니다." });
      }
      const id = Number(url.pathname.split("/")[2]);
      const result = await pool.query(
        "UPDATE applications SET status = $1 WHERE id = $2 RETURNING id, status",
        [status, id],
      );
      if (!result.rowCount) return send(response, 404, { error: "신청을 찾을 수 없습니다." });
      return send(response, 200, { application: result.rows[0] });
    }

    return send(response, 404, { error: "Not found" });
  } catch (error) {
    console.error("Request failed:", error);
    return send(response, 500, { error: "요청 처리 중 문제가 발생했습니다." });
  }
}).listen(port, "0.0.0.0");
