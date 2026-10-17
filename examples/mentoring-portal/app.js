const state = {
  token: localStorage.getItem("mentoring-demo-token"),
  user: JSON.parse(localStorage.getItem("mentoring-demo-user") || "null"),
  mentors: [],
};

const $ = (selector) => document.querySelector(selector);
const loginView = $("#login-view");
const portalView = $("#portal-view");
const account = $("#account");
const toast = $("#toast");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  if (options.body) headers["content-type"] = "application/json";
  const response = await fetch(path, { ...options, headers });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "요청을 완료하지 못했습니다.");
  return body;
}

function setLoggedIn(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem("mentoring-demo-token", token);
  localStorage.setItem("mentoring-demo-user", JSON.stringify(user));
  loginView.hidden = true;
  portalView.hidden = false;
  account.hidden = false;
  account.innerHTML = `${escapeHtml(user.name)} · ${user.role === "admin" ? "운영자" : user.role === "mentor" ? "멘토" : "멘티"} <button id="logout-button" type="button">로그아웃</button>`;
  $("#greeting").textContent = `${user.name}님, 반가워요`;
  $("#logout-button").addEventListener("click", logout);
  loadMentors();
}

function logout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem("mentoring-demo-token");
  localStorage.removeItem("mentoring-demo-user");
  loginView.hidden = false;
  portalView.hidden = true;
  account.hidden = true;
  $("#login-error").textContent = "";
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const error = $("#login-error");
  error.textContent = "";
  try {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    setLoggedIn(result.user, result.token);
  } catch (problem) {
    error.textContent = problem.message;
  }
});

async function loadMentors() {
  try {
    const result = await request("/api/mentors");
    state.mentors = result.mentors;
    $("#mentor-count").textContent = `${result.mentors.length}명의 멘토`;
    $("#mentor-list").innerHTML = result.mentors.map((mentor) => `
      <article class="card mentor-card">
        <div class="mentor-head">
          <div class="avatar">${escapeHtml(mentor.name.slice(0, 1))}</div>
          <div><h3>${escapeHtml(mentor.name)}</h3><div class="title-line">${escapeHtml(mentor.title)}</div></div>
        </div>
        <p>${escapeHtml(mentor.bio)}</p>
        <div class="tags">${mentor.topics.map((topic) => `<span class="tag">${escapeHtml(topic)}</span>`).join("")}</div>
        ${state.user.role === "mentee" ? `<button class="button secondary apply-button" data-id="${escapeHtml(mentor.id)}" data-name="${escapeHtml(mentor.name)}">멘토링 신청</button>` : ""}
      </article>`).join("");
    document.querySelectorAll(".apply-button").forEach((button) => {
      button.addEventListener("click", () => openApplication(button.dataset.id, button.dataset.name));
    });
  } catch (problem) {
    $("#mentor-list").innerHTML = `<p class="error">${escapeHtml(problem.message)}</p>`;
  }
}

function openApplication(mentorId, mentorName) {
  const dialog = $("#application-dialog");
  $("#dialog-title").textContent = `${mentorName} 멘토에게 신청하기`;
  $("#application-form").elements.mentorId.value = mentorId;
  dialog.showModal();
}

$("#close-dialog").addEventListener("click", () => $("#application-dialog").close());

$("#application-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await request("/api/applications", {
      method: "POST",
      body: JSON.stringify({ mentorId: form.get("mentorId"), goal: form.get("goal") }),
    });
    event.currentTarget.reset();
    $("#application-dialog").close();
    showToast("멘토링 신청을 저장했어요.");
    await loadApplications();
    setActiveTab("applications");
  } catch (problem) {
    showToast(problem.message);
  }
});

$("#search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = new FormData(event.currentTarget).get("q");
  const container = $("#knowledge-results");
  try {
    const result = await request(`/knowledge/search?q=${encodeURIComponent(query)}`);
    container.innerHTML = result.results.length
      ? result.results.map((document) => `
        <article class="knowledge-card">
          <span class="source">${escapeHtml(document.category)} · 출처: ${escapeHtml(document.title)}</span>
          <h3>${escapeHtml(document.title)}</h3>
          <p>${escapeHtml(document.content)}</p>
        </article>`).join("")
      : '<div class="empty">검색 결과가 없어요. 다른 키워드로 검색해 보세요.</div>';
  } catch (problem) {
    container.innerHTML = `<p class="error">${escapeHtml(problem.message)}</p>`;
  }
});

function statusLabel(status) {
  return { submitted: "검토 대기", accepted: "수락", declined: "이번 매칭은 어려워요" }[status] || status;
}

async function loadApplications() {
  const container = $("#application-list");
  $("#applications-title").textContent = state.user.role === "admin" ? "전체 멘토링 신청" : "나의 신청 현황";
  try {
    const result = await request("/api/applications");
    container.innerHTML = result.applications.length
      ? result.applications.map((application) => `
        <article class="application-card">
          <div class="application-top">
            <div><span class="source">멘토 ${escapeHtml(application.mentorName || state.mentors.find((mentor) => mentor.id === application.mentorId)?.name || "확인 중")}</span>
            <h3>신청 #${escapeHtml(application.id)}</h3></div>
            <span class="status ${escapeHtml(application.status)}">${escapeHtml(statusLabel(application.status))}</span>
          </div>
          <p>${escapeHtml(application.goal)}</p>
          ${state.user.role === "admin" && application.status === "submitted" ? `
            <div class="admin-actions">
              <button class="button primary status-button" data-id="${escapeHtml(application.id)}" data-status="accepted">수락</button>
              <button class="button secondary status-button" data-id="${escapeHtml(application.id)}" data-status="declined">보류</button>
            </div>` : ""}
        </article>`).join("")
      : '<div class="empty">아직 신청 내역이 없습니다.</div>';
    document.querySelectorAll(".status-button").forEach((button) => {
      button.addEventListener("click", () => updateStatus(button.dataset.id, button.dataset.status));
    });
  } catch (problem) {
    container.innerHTML = `<p class="error">${escapeHtml(problem.message)}</p>`;
  }
}

async function updateStatus(id, status) {
  try {
    await request(`/api/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showToast("신청 상태를 변경했어요.");
    await loadApplications();
  } catch (problem) {
    showToast(problem.message);
  }
}

function setActiveTab(view) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  document.querySelectorAll(".panel").forEach((panel) => { panel.hidden = panel.id !== `${view}-panel`; });
  if (view === "applications") loadApplications();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.view));
});

if (state.token && state.user) {
  setLoggedIn(state.user, state.token);
} else {
  loginView.hidden = false;
  portalView.hidden = true;
  account.hidden = true;
}
