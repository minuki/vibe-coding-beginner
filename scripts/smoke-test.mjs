const baseUrl = process.env.BASE_URL || "http://localhost:8080";
const deadline = Date.now() + 90_000;

async function waitForPortal() {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Portal did not become healthy within 90 seconds.");
}

async function call(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

await waitForPortal();
const session = await call("/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "mentee@demo.local", password: "demo123" }),
});
const headers = {
  authorization: `Bearer ${session.token}`,
  "content-type": "application/json",
};
const { mentors } = await call("/api/mentors", { headers });
if (mentors.length < 1) throw new Error("Expected sample mentors.");
const created = await call("/api/applications", {
  method: "POST",
  headers,
  body: JSON.stringify({ mentorId: mentors[0].id, goal: "CI integration smoke test" }),
});
if (!created.application?.id) throw new Error("Application was not persisted.");
const { applications } = await call("/api/applications", { headers });
if (!applications.some((application) => application.id === created.application.id)) {
  throw new Error("Created application was not returned by the list endpoint.");
}
const adminSession = await call("/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "admin@demo.local", password: "demo123" }),
});
const adminHeaders = {
  authorization: `Bearer ${adminSession.token}`,
  "content-type": "application/json",
};
const reviewed = await call(`/api/applications/${created.application.id}/status`, {
  method: "PATCH",
  headers: adminHeaders,
  body: JSON.stringify({ status: "accepted" }),
});
if (reviewed.application.status !== "accepted") {
  throw new Error("Admin application review did not persist.");
}
const knowledge = await call("/knowledge/search?q=첫 대화");
if (!knowledge.results?.length) throw new Error("Expected matching knowledge documents.");
console.log("Smoke test passed: login, mentor listing, application persistence, admin review, and knowledge search.");
