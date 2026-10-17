const http = require("node:http");

const documents = [
  {
    id: "guide-start",
    title: "멘토링 프로그램 참여 안내",
    category: "프로그램 안내",
    content: "멘토링은 구성원의 성장 목표를 함께 탐색하는 자발적 프로그램입니다. 참여자는 한 달에 한 번 이상 대화하고, 각자의 목표와 가능한 일정을 미리 공유합니다.",
  },
  {
    id: "guide-first-session",
    title: "첫 멘토링 대화 준비하기",
    category: "세션 가이드",
    content: "첫 대화에서는 서로의 역할과 기대를 확인하고, 멘티가 이번 프로그램에서 이루고 싶은 목표를 한두 가지 정합니다. 정답을 찾기보다 경험과 관점을 나누는 데 집중합니다.",
  },
  {
    id: "guide-topics",
    title: "대화 주제 예시",
    category: "세션 가이드",
    content: "커리어 방향, 업무 우선순위, 협업과 소통, 새로운 역할에 적응하기, 역량 개발 방법 등을 대화 주제로 활용할 수 있습니다.",
  },
  {
    id: "guide-boundaries",
    title: "안전하고 존중하는 멘토링",
    category: "참여 원칙",
    content: "멘토링은 자발적이고 상호 존중을 바탕으로 합니다. 개인적인 이야기는 참여자의 동의 없이 공유하지 않으며, 민감한 인사·건강·고객 정보를 기록하지 않습니다.",
  },
  {
    id: "guide-cancel",
    title: "일정 변경과 세션 취소",
    category: "운영 안내",
    content: "일정 변경이 필요하면 가능한 한 빨리 상대방에게 알리고 새 일정을 협의합니다. 참여가 어려워지면 프로그램 운영자에게 알려 매칭 조정을 요청할 수 있습니다.",
  },
];
const port = Number(process.env.PORT || 3002);

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/healthz") {
    return send(response, 200, { status: "ok", mock: true });
  }
  if (request.method === "GET" && url.pathname === "/search") {
    const query = (url.searchParams.get("q") || "").trim().toLocaleLowerCase("ko");
    if (!query) return send(response, 200, { results: [] });
    const terms = query.split(/\s+/).filter(Boolean);
    const results = documents
      .map((document) => {
        const text = `${document.title} ${document.category} ${document.content}`.toLocaleLowerCase("ko");
        const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
        return { ...document, score };
      })
      .filter((document) => document.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...document }) => document);
    return send(response, 200, { results });
  }
  return send(response, 404, { error: "Not found" });
}).listen(port, "0.0.0.0");
