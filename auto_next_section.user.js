// ==UserScript==
// @name         Auto Next Section Clicker
// @namespace    https://github.com/
// @version      0.2
// @description  自动检测并点击页面中的“下一节”按钮，或隐藏弹窗。
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 配置：修改这几项以改变行为
    const CONFIG = {
        autoClick: true,        // true 自动点击“下一节”，false 不自动点击
        hideModal: false,       // true 隐藏弹窗而不点击
        buttonTexts: ['下一节','下一章'], // 识别按钮的文本关键字
        checkInterval: 500,     // ms, 定期扫描
        maxAttempts: 120        // 尝试次数
    };

    let attempts = 0;
    let clicked = false;

    function textMatches(text) {
        if (!text) return false;
        const s = text.replace(/\s+/g,'').trim();
        return CONFIG.buttonTexts.some(t => s.includes(t.replace(/\s+/g,'')));
    }

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
    }

    function clickElement(el) {
        try {
            el.click();
            console.log('[AutoNext] clicked element', el);
            clicked = true;
            return true;
        } catch (e) {
            try {
                const ev = document.createEvent('MouseEvents');
                ev.initMouseEvent('click', true, true, window);
                el.dispatchEvent(ev);
                console.log('[AutoNext] dispatched click', el);
                clicked = true;
                return true;
            } catch (err) {
                console.warn('[AutoNext] click failed', err);
                return false;
            }
        }
    }

    function hideElement(el) {
        try {
            el.style.display = 'none';
            return true;
        } catch (e) { return false; }
    }

    function scanAndAct() {
        if (clicked) return;
        attempts++;
        if (attempts > CONFIG.maxAttempts) {
            console.log('[AutoNext] max attempts reached');
            observer.disconnect();
            clearInterval(intervalId);
            return;
        }

        // 1. 查找可见按钮或链接
        const nodes = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], div, span'));
        for (const n of nodes) {
            try {
                if (!isVisible(n)) continue;
                const txt = n.innerText || n.textContent || '';
                if (textMatches(txt)) {
                    if (CONFIG.autoClick) {
                        if (clickElement(n)) return;
                    } else if (CONFIG.hideModal) {
                        // 尝试隐藏父级弹窗或覆盖层
                        let parent = n.closest('[role="dialog"], .modal, .popup, .layer') || n.parentElement;
                        for (let i=0;i<6 && parent;i++) {
                            hideElement(parent);
                            parent = parent.parentElement;
                        }
                        console.log('[AutoNext] hidden modal containing match');
                        return;
                    }
                }
            } catch (e) { /* ignore */ }
        }

        // 2. XPath 查找包含“下一节”的任意节点
        const xpath = "//*[contains(normalize-space(string(.)),'下一节') or contains(normalize-space(string(.)),'下一章')]";
        const it = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        let el;
        while ((el = it.iterateNext())) {
            if (isVisible(el)) {
                if (CONFIG.autoClick) { clickElement(el); return; }
                if (CONFIG.hideModal) { let parent = el.closest('[role="dialog"], .modal, .popup, .layer') || el.parentElement; for (let i=0;i<6 && parent;i++){ hideElement(parent); parent = parent.parentElement; } return; }
            }
        }
    }

    // 监听 DOM 变化
    const observer = new MutationObserver(function(mutations) {
        if (clicked) return;
        scanAndAct();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const intervalId = setInterval(scanAndAct, CONFIG.checkInterval);

    // 如果页面是 SPA，也可手动调用 window.autoNextClick()
    window.autoNextClick = function() { CONFIG.autoClick = true; clicked = false; attempts = 0; scanAndAct(); };

    console.log('[AutoNext] started');
})();
