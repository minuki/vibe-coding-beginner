(() => {
  const initialVersion = document.currentScript.dataset.version;
  const status = document.createElement("output");
  status.textContent = "실시간 미리보기 · 연결됨";
  status.setAttribute("aria-live", "polite");
  status.style.cssText = "position:fixed;bottom:12px;right:12px;z-index:9999;padding:8px 12px;border:1px solid var(--cp-border);border-radius:10px;background:var(--cp-surface);color:var(--cp-text-muted);font:12px 'Segoe UI',sans-serif";
  document.body.append(status);
  let pending = false;
  let previousVersion = initialVersion;
  window.setInterval(async () => {
    if (pending) return;
    pending = true;
    try {
      const response = await fetch("/__workshop/version", { cache: "no-store" });
      if (!response.ok) throw new Error(`Preview status: ${response.status}`);
      const { version } = await response.json();
      // Wait for a stable snapshot before reloading multi-file edits.
      if (version !== initialVersion && version === previousVersion) window.location.reload();
      previousVersion = version;
      status.textContent = "실시간 미리보기 · 연결됨";
    } catch (error) {
      console.error("Live preview disconnected:", error);
      status.textContent = "미리보기 연결 끊김 · Copilot에게 실행 상태를 확인해 주세요";
    } finally {
      pending = false;
    }
  }, 1000);
})();
