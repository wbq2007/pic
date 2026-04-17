// background.js - Service Worker
// 处理搜题 API 请求、配置管理

const DEFAULT_CONFIG = {
  apiSources: [
    { name: "icodef", url: "https://api.icodef.com/search", enabled: true },
    { name: "enncy", url: "https://tk.enncy.cn/search", enabled: true },
    { name: "muke", url: "https://api.muketool.com/search", enabled: true },
  ],
  autoAnswer: true,
  delay: 1500, // 请求间隔(ms)，防封
  currentApiIndex: 0,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ config: DEFAULT_CONFIG });
});

// 接收内容脚本的搜题请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEARCH_QUESTION") {
    searchQuestion(message.question).then((result) => {
      sendResponse(result);
    });
    return true; // 异步响应
  }

  if (message.type === "GET_CONFIG") {
    chrome.storage.local.get(["config"], (data) => {
      sendResponse(data.config || DEFAULT_CONFIG);
    });
    return true;
  }

  if (message.type === "SAVE_CONFIG") {
    chrome.storage.local.set({ config: message.config });
    sendResponse({ success: true });
    return true;
  }
});

// 搜索题目
async function searchQuestion(questionText) {
  const { config } = await chrome.storage.local.get(["config"]);
  const cfg = config || DEFAULT_CONFIG;
  const enabledApis = cfg.apiSources.filter((a) => a.enabled);

  for (let i = 0; i < enabledApis.length; i++) {
    const api = enabledApis[i];
    try {
      const result = await callApi(api, questionText);
      if (result && result.answer) {
        return { success: true, answer: result.answer, source: api.name, explanation: result.explanation || "" };
      }
    } catch (e) {
      console.warn(`API ${api.name} failed:`, e.message);
    }
    // 请求间隔
    await sleep(cfg.delay);
  }

  return { success: false, error: "所有API均未返回结果" };
}

async function callApi(api, question) {
  const response = await fetch(api.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, type: "auto" }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return normalizeResponse(data, api.name);
}

// 统一不同API的返回格式
function normalizeResponse(data, source) {
  // 常见响应格式适配
  const answer =
    data.answer ||
    data.data?.answer ||
    data.result?.answer ||
    data.content?.answer ||
    data.data?.content ||
    "";

  const explanation =
    data.explanation ||
    data.data?.explanation ||
    data.result?.analysis ||
    data.data?.analysis ||
    "";

  return { answer, explanation };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
