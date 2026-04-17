// popup.js - 弹出窗口逻辑

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  bindEvents();
});

function loadSettings() {
  chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (config) => {
    if (!config) return;

    document.getElementById("auto-answer").checked = config.autoAnswer !== false;
    document.getElementById("delay").value = config.delay || 1500;

    // 渲染API源
    const container = document.getElementById("api-sources");
    container.innerHTML = "";
    for (const api of config.apiSources || []) {
      const div = document.createElement("div");
      div.className = "api-item";
      div.innerHTML = `
        <input type="checkbox" ${api.enabled ? "checked" : ""} data-api="${api.name}">
        <span class="api-name">${api.name}</span>
        <span class="api-url">${api.url}</span>
      `;
      container.appendChild(div);
    }
  });
}

function bindEvents() {
  // 保存设置
  document.getElementById("auto-answer").addEventListener("change", saveSettings);
  document.getElementById("delay").addEventListener("change", saveSettings);

  // API源切换
  document.getElementById("api-sources").addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      saveSettings();
    }
  });

  // 手动搜索
  document.getElementById("manual-search-btn").addEventListener("click", doManualSearch);
  document.getElementById("manual-question").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doManualSearch();
  });

  // 打开侧边栏
  document.getElementById("open-sidebar-btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_SIDEBAR" });
      }
    });
    window.close();
  });
}

function saveSettings() {
  chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (config) => {
    config.autoAnswer = document.getElementById("auto-answer").checked;
    config.delay = parseInt(document.getElementById("delay").value, 10);

    // 更新API源状态
    const checkboxes = document.querySelectorAll("#api-sources input[type='checkbox']");
    for (const cb of checkboxes) {
      const api = config.apiSources.find((a) => a.name === cb.dataset.api);
      if (api) api.enabled = cb.checked;
    }

    chrome.runtime.sendMessage({ type: "SAVE_CONFIG", config });
  });
}

function doManualSearch() {
  const question = document.getElementById("manual-question").value.trim();
  if (!question) return;

  const resultDiv = document.getElementById("search-result");
  resultDiv.innerHTML = '<div class="loading">搜索中...</div>';

  chrome.runtime.sendMessage({ type: "SEARCH_QUESTION", question }, (result) => {
    if (result && result.success) {
      resultDiv.innerHTML = `
        <div class="result success">
          <div class="result-answer">✅ ${result.answer}</div>
          <div class="result-source">来源: ${result.source}</div>
          ${result.explanation ? `<div class="result-explanation">解析: ${result.explanation}</div>` : ""}
        </div>
      `;
    } else {
      resultDiv.innerHTML = `<div class="result error">❌ ${result?.error || "未找到答案"}</div>`;
    }
  });
}
