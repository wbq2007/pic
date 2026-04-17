// content.js - 内容脚本
// 自动识别题目、搜索答案、填入答案、注入侧边栏

(function () {
  "use strict";

  // 当前平台检测
  const platform = detectPlatform();

  // 侧边栏状态
  let sidebarVisible = false;
  let sidebarEl = null;

  // 已处理的题目集合（防重复）
  const processedQuestions = new Set();

  // 初始化
  init();

  function init() {
    loadConfig().then((config) => {
      // 注入侧边栏
      injectSidebar();

      // 开始监听题目
      if (config.autoAnswer) {
        startAutoDetect(config);
      }

      // 监听来自 popup 的消息
      chrome.runtime.onMessage.addListener(handleMessage);
    });
  }

  // 检测当前平台
  function detectPlatform() {
    const url = window.location.href;
    if (url.includes("chaoxing.com") || url.includes("edu.cn")) return "chaoxing";
    if (url.includes("zhihuishu.com")) return "zhihuishu";
    if (url.includes("icourse163.org")) return "icourse";
    if (url.includes("xuetangx.com")) return "xuetangx";
    return "unknown";
  }

  // 加载配置
  function loadConfig() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_CONFIG" }, (config) => {
        resolve(config || { autoAnswer: true, delay: 1500 });
      });
    });
  }

  // 自动检测题目
  function startAutoDetect(config) {
    const observer = new MutationObserver((mutations) => {
      detectQuestions(config);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 初始检测
    setTimeout(() => detectQuestions(config), 2000);
  }

  // 检测页面上的题目
  function detectQuestions(config) {
    let questions = [];

    switch (platform) {
      case "chaoxing":
        questions = detectChaoxing();
        break;
      case "zhihuishu":
        questions = detectZhihuishu();
        break;
      default:
        questions = detectGeneric();
        break;
    }

    for (const q of questions) {
      const key = q.text.substring(0, 30);
      if (processedQuestions.has(key)) continue;
      processedQuestions.add(key);

      processQuestion(q, config);
    }
  }

  // 超星学习通题目检测
  function detectChaoxing() {
    const questions = [];
    // 常见的题目容器选择器
    const selectors = [
      ".Zy_TItle .clearfix",
      ".questionBody",
      ".TiMu",
      ".examQuestionTitle",
      "[class*='question']",
      ".answerCard .question",
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = extractQuestionText(el);
        if (text && text.length > 5) {
          const options = extractOptions(el);
          const type = detectQuestionType(text, options);
          questions.push({ text, options, type, element: el });
        }
      }
    }
    return questions;
  }

  // 智慧树题目检测
  function detectZhihuishu() {
    const questions = [];
    const selectors = [".question-list .question", ".examQuestionTitle", "[class*='question']"];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = extractQuestionText(el);
        if (text && text.length > 5) {
          const options = extractOptions(el);
          const type = detectQuestionType(text, options);
          questions.push({ text, options, type, element: el });
        }
      }
    }
    return questions;
  }

  // 通用题目检测
  function detectGeneric() {
    const questions = [];
    // 尝试查找包含题意的元素
    const allElements = document.querySelectorAll("div, p, li, td");
    for (const el of allElements) {
      const text = el.textContent.trim();
      // 简单启发式判断：包含问号、选择题关键词、长度适中
      if (
        text.length > 10 &&
        text.length < 500 &&
        (text.includes("?") || text.includes("？") || /\bA[.、]/.test(text) || /选项/.test(text))
      ) {
        // 避免重复检测子元素
        if (el.parentElement && processedQuestions.has(el.parentElement.textContent.substring(0, 30))) continue;

        const options = extractOptions(el);
        const type = detectQuestionType(text, options);
        questions.push({ text, options, type, element: el });
      }
    }
    return questions;
  }

  // 提取题目文字
  function extractQuestionText(element) {
    // 移除选项部分
    const clone = element.cloneNode(true);
    // 尝试移除选项元素
    const optionSelectors = [".option", ".options", "li", "[class*='option']"];
    for (const sel of optionSelectors) {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    }

    let text = clone.textContent.trim();
    // 清理
    text = text.replace(/^\d+[.、\s]*/, ""); // 去除题号
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/【?[单选题|多选题|判断题|填空题|问答题】?/g, "").trim();
    return text;
  }

  // 提取选项
  function extractOptions(element) {
    const options = [];
    const optionElements = element.querySelectorAll(".option, .options li, [class*='option']");
    for (const optEl of optionElements) {
      const text = optEl.textContent.trim();
      if (text.length > 0) {
        const match = text.match(/^([A-Z])[.、\s](.+)/);
        options.push({
          label: match ? match[1] : "",
          text: match ? match[2] : text,
          element: optEl,
        });
      }
    }
    return options;
  }

  // 判断题目类型
  function detectQuestionType(text, options) {
    if (text.includes("正确") && text.includes("错误")) return "truefalse";
    if (options.length >= 2) return "choice";
    if (text.includes("____") || text.includes("_") || text.includes("（）") || text.includes("( )")) return "fill";
    return "unknown";
  }

  // 处理单个题目：搜索答案并填入
  async function processQuestion(question, config) {
    updateSidebar({ type: "searching", text: question.text });

    try {
      const result = await chrome.runtime.sendMessage({
        type: "SEARCH_QUESTION",
        question: question.text,
      });

      if (result.success) {
        updateSidebar({ type: "found", text: question.text, answer: result.answer, source: result.source, explanation: result.explanation });

        // 自动答题
        if (config.autoAnswer) {
          autoFillAnswer(question, result.answer);
        }
      } else {
        updateSidebar({ type: "notfound", text: question.text });
      }
    } catch (e) {
      updateSidebar({ type: "error", text: question.text, error: e.message });
    }
  }

  // 自动填入答案
  function autoFillAnswer(question, answer) {
    if (!answer) return;

    const answerText = String(answer).trim().toUpperCase();

    if (question.type === "choice" || question.type === "truefalse") {
      // 选择题：高亮正确选项
      for (const opt of question.options) {
        if (opt.label === answerText) {
          // 尝试点击选项
          const clickable = opt.element.querySelector("a, button, input[type='radio'], input[type='checkbox']") || opt.element;
          clickable.click();
          // 高亮标记
          opt.element.style.backgroundColor = "#d4edda";
          opt.element.style.border = "2px solid #28a745";
          opt.element.style.position = "relative";
          const badge = document.createElement("span");
          badge.textContent = " ✓";
          badge.style.color = "#28a745";
          badge.style.fontWeight = "bold";
          badge.style.position = "absolute";
          badge.style.right = "5px";
          badge.style.top = "5px";
          opt.element.style.position = "relative";
          opt.element.appendChild(badge);
          break;
        }
      }
    } else if (question.type === "truefalse") {
      // 判断题
      const isTrue = answerText.includes("正确") || answerText.includes("T") || answerText.includes("A");
      const inputs = question.element.querySelectorAll('input[type="radio"]');
      for (const input of inputs) {
        const val = input.value.toLowerCase();
        if ((isTrue && (val === "true" || val === "1" || val === "a")) || (!isTrue && (val === "false" || val === "0" || val === "b"))) {
          input.checked = true;
          input.dispatchEvent(new Event("change"));
          break;
        }
      }
    } else if (question.type === "fill") {
      // 填空题：填入文本
      const inputs = question.element.querySelectorAll('input[type="text"], textarea');
      for (const input of inputs) {
        input.value = answer;
        input.dispatchEvent(new Event("input"));
        input.dispatchEvent(new Event("change"));
        input.style.backgroundColor = "#d4edda";
        break;
      }
    }
  }

  // === 侧边栏相关 ===

  function injectSidebar() {
    if (document.getElementById("uqs-sidebar")) return;

    sidebarEl = document.createElement("div");
    sidebarEl.id = "uqs-sidebar";
    sidebarEl.className = "uqs-sidebar";
    sidebarEl.innerHTML = `
      <div class="uqs-sidebar-header">
        <span class="uqs-sidebar-title">📚 大学搜题助手</span>
        <div class="uqs-sidebar-actions">
          <button class="uqs-btn uqs-btn-sm" id="uqs-search-selected" title="搜索选中文字">🔍 选中搜索</button>
          <button class="uqs-btn uqs-btn-sm uqs-btn-icon" id="uqs-minimize" title="最小化">─</button>
          <button class="uqs-btn uqs-btn-sm uqs-btn-icon" id="uqs-close" title="关闭">✕</button>
        </div>
      </div>
      <div class="uqs-sidebar-body" id="uqs-sidebar-body">
        <div class="uqs-status">🟢 已启动，正在监听页面题目...</div>
        <div class="uqs-history" id="uqs-history"></div>
      </div>
      <div class="uqs-sidebar-footer">
        <span class="uqs-version">v1.0.0</span>
      </div>
    `;

    document.body.appendChild(sidebarEl);
    sidebarVisible = true;

    // 绑定事件
    document.getElementById("uqs-close").addEventListener("click", () => {
      sidebarEl.style.display = "none";
      sidebarVisible = false;
    });

    document.getElementById("uqs-minimize").addEventListener("click", () => {
      const body = document.getElementById("uqs-sidebar-body");
      body.style.display = body.style.display === "none" ? "block" : "none";
    });

    document.getElementById("uqs-search-selected").addEventListener("click", () => {
      const selected = window.getSelection().toString().trim();
      if (selected) {
        searchAndShow(selected);
      } else {
        updateSidebar({ type: "info", text: "请先在页面上选中题目文字" });
      }
    });

    // 双击侧边栏标题可拖拽（简单实现）
    makeDraggable(sidebarEl, document.querySelector(".uqs-sidebar-header"));
  }

  function updateSidebar(data) {
    const body = document.getElementById("uqs-sidebar-body");
    if (!body) return;
    const history = document.getElementById("uqs-history");

    const item = document.createElement("div");
    item.className = "uqs-history-item";

    switch (data.type) {
      case "searching":
        item.innerHTML = `<div class="uqs-q"><span class="uqs-loading">⏳ 搜索中...</span><div class="uqs-q-text">${escapeHtml(data.text.substring(0, 80))}</div></div>`;
        break;
      case "found":
        item.innerHTML = `
          <div class="uqs-q"><div class="uqs-q-text">${escapeHtml(data.text.substring(0, 100))}</div></div>
          <div class="uqs-a">✅ 答案: <strong>${escapeHtml(data.answer)}</strong> <span class="uqs-source">[${data.source}]</span></div>
          ${data.explanation ? `<div class="uqs-explanation">📖 解析: ${escapeHtml(data.explanation.substring(0, 200))}</div>` : ""}
        `;
        break;
      case "notfound":
        item.innerHTML = `<div class="uqs-q"><div class="uqs-q-text">${escapeHtml(data.text.substring(0, 80))}</div></div><div class="uqs-a uqs-notfound">❌ 未找到答案</div>`;
        break;
      case "error":
        item.innerHTML = `<div class="uqs-q"><div class="uqs-q-text">${escapeHtml(data.text.substring(0, 80))}</div></div><div class="uqs-a uqs-error">⚠️ 搜索失败: ${escapeHtml(data.error)}</div>`;
        break;
      case "info":
        item.innerHTML = `<div class="uqs-a uqs-info">ℹ️ ${escapeHtml(data.text)}</div>`;
        break;
    }

    history.prepend(item);

    // 限制历史记录数量
    while (history.children.length > 50) {
      history.removeChild(history.lastChild);
    }
  }

  function searchAndShow(text) {
    updateSidebar({ type: "searching", text: text });
    chrome.runtime.sendMessage({ type: "SEARCH_QUESTION", question: text }, (result) => {
      if (result && result.success) {
        updateSidebar({ type: "found", text: text, answer: result.answer, source: result.source, explanation: result.explanation });
      } else {
        updateSidebar({ type: "notfound", text: text });
      }
    });
  }

  // 使元素可拖拽
  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.style.cursor = "move";
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.style.position === "fixed" ? "auto" : element.offsetLeft - pos1 + "px";
      element.style.right = "auto";
      element.style.position = "fixed";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // HTML转义
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // 接收消息
  function handleMessage(message, sender, sendResponse) {
    if (message.type === "TOGGLE_SIDEBAR") {
      if (sidebarEl) {
        sidebarEl.style.display = sidebarEl.style.display === "none" ? "flex" : "none";
      }
    }
    if (message.type === "SEARCH_FROM_POPUP") {
      searchAndShow(message.question);
      sendResponse({ success: true });
    }
  }
})();
