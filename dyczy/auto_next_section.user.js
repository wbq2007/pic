// ==UserScript==
// @name         Auto Next Section Clicker
// @namespace    https://github.com/
// @version      0.3
// @description  自动检测并点击页面中的“下一节”按钮，或隐藏弹窗。增强对 Shadow DOM、iframe、多语言与属性按钮的兼容性。
// @match        *://*/*
// @match        file://*/*
// @include      *://*/*
// @include      file://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    console.log('[AutoNext] IIFE loaded (v0.3)'); // debug: 表明脚本被注入并执行

    // 配置：修改这些项以改变行为
    const CONFIG = {
        autoClick: true,        // true 自动点击“下一节”，false 不自动点击
        hideModal: false,       // true 隐藏弹窗而不点击
        // 更丰富的关键字（多语言）
        buttonTexts: ['下一节','下一章','下一页','下一篇','下一课','继续','Next','Next Chapter','Next Section','Next Page','Continue'],
        // 属性也会被匹配
        attrKeys: ['aria-label','title','alt','value','placeholder','data-title'],
        checkInterval: 500,     // ms, 定期扫描
        maxAttempts: 240,       // 尝试次数
        debug: true
    };

    let attempts = 0;
    let clicked = false;

    function log(...args){ if (CONFIG.debug) console.log('[AutoNext]', ...args); }

    function normalize(s){ return (s||'').replace(/\s+/g,'').trim().toLowerCase(); }

    function textMatches(text){
        if (!text) return false;
        const s = normalize(text);
        return CONFIG.buttonTexts.some(t => s.includes(normalize(t)));
    }

    function attributeMatches(el){
        try{
            for (const k of CONFIG.attrKeys){
                if (el.getAttribute && el.hasAttribute && el.hasAttribute(k)){
                    if (textMatches(el.getAttribute(k))) return true;
                }
            }
            // dataset 也检查
            for (const key of Object.keys(el.dataset || {})){
                if (textMatches(el.dataset[key])) return true;
            }
        }catch(e){}
        return false;
    }

    function isVisible(el){
        if (!el || !el.getBoundingClientRect) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) return false;
        return true;
    }

    function tryClick(el){
        if (!el) return false;
        try{ el.scrollIntoView({block:'center', inline:'center'}); }catch(e){}
        try{
            el.click();
            log('clicked via click()', el);
            clicked = true;
            return true;
        }catch(e){ log('click() failed', e); }
        // 退化为合成事件
        const send = (type) => {
            try{ const ev = new MouseEvent(type, {bubbles:true, cancelable:true, view:window}); return el.dispatchEvent(ev); }catch(e){ return false; }
        };
        if (send('pointerdown') && send('mousedown') && send('mouseup') && send('click')){
            log('clicked via events', el);
            clicked = true; return true;
        }
        // 键盘回退（例如可聚焦的按钮）
        try{
            el.focus && el.focus();
            const kd = new KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true});
            el.dispatchEvent(kd);
            const ku = new KeyboardEvent('keyup', {key:'Enter', bubbles:true, cancelable:true});
            el.dispatchEvent(ku);
            log('triggered via keyboard', el);
            clicked = true; return true;
        }catch(e){ log('keyboard fallback failed', e); }
        return false;
    }

    function hideOverlay(el){
        if (!el) return false;
        try{ el.style.display = 'none'; el.style.visibility = 'hidden'; return true; }catch(e){ return false; }
    }

    // 收集 root 下的元素，递归进入 open shadowRoot
    function collectElements(root=document){
        const results = [];
        const doc = (root && root.ownerDocument) ? root.ownerDocument : document;
        let walker;
        try{ walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false); }catch(e){ return results; }
        let node = walker.currentNode;
        while(node){
            results.push(node);
            if (node.shadowRoot){
                try{ results.push(...collectElements(node.shadowRoot)); }catch(e){}
            }
            node = walker.nextNode();
        }
        return results;
    }

    function scanRoot(root=document){
        if (clicked) return false;
        const selector = 'button, a, input[type="button"], input[type="submit"], [role="button"], [data-next], [data-action], [aria-label], [title], div, span';
        const nodes = Array.from((root.querySelectorAll && root.querySelectorAll(selector)) || []);
        for (const n of nodes){
            try{
                if (!isVisible(n)) continue;
                const txt = n.innerText || n.textContent || '';
                if (textMatches(txt) || attributeMatches(n) || /next|下一|继续|chapter|page/i.test((n.getAttribute && n.getAttribute('href'))||'')){
                    if (CONFIG.autoClick){ if (tryClick(n)) return true; }
                    if (CONFIG.hideModal){ let parent = (n.closest && (n.closest('[role="dialog"], .modal, .popup, .layer'))) || n.parentElement; for(let i=0;i<8 && parent;i++){ hideOverlay(parent); parent = parent.parentElement; } log('hidden modal containing match'); return true; }
                }
            }catch(e){}
        }
        // 深度扫描（包括 shadowRoot）
        const deep = collectElements(root);
        for (const n of deep){
            try{
                if (!isVisible(n)) continue;
                const txt = n.innerText || n.textContent || '';
                if (textMatches(txt) || attributeMatches(n)){
                    if (CONFIG.autoClick){ if (tryClick(n)) return true; }
                    if (CONFIG.hideModal){ let parent = (n.closest && n.closest('[role="dialog"], .modal, .popup, .layer')) || n.parentElement; for(let i=0;i<8 && parent;i++){ hideOverlay(parent); parent = parent.parentElement; } return true; }
                }
            }catch(e){}
        }
        // XPath 作为最后回退（在 root 所在文档中）
        try{
            const parts = CONFIG.buttonTexts.map(t => `contains(normalize-space(string(.)),"${t.replace(/\"/g,'\\\"')}")`).join(' or ');
            const xp = `.//*[${parts}]`;
            const evaluator = (root.evaluate) ? root : document;
            const it = evaluator.evaluate(xp, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            let el;
            while((el = it.iterateNext())){
                if (isVisible(el)){
                    if (CONFIG.autoClick){ if (tryClick(el)) return true; }
                    if (CONFIG.hideModal){ let parent = (el.closest && el.closest('[role="dialog"], .modal, .popup, .layer')) || el.parentElement; for(let i=0;i<8 && parent;i++){ hideOverlay(parent); parent = parent.parentElement; } return true; }
                }
            }
        }catch(e){}
        return false;
    }

    // 同源 iframe 扫描
    function scanFrames(){
        const iframes = Array.from(document.querySelectorAll('iframe'));
        for (const f of iframes){
            try{
                const fd = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                if (fd && fd !== document){ if (scanRoot(fd)) return true; }
            }catch(e){}
        }
        return false;
    }

    function scanAndAct(){
        if (clicked) return;
        attempts++;
        if (attempts > CONFIG.maxAttempts){ log('max attempts reached'); observer.disconnect(); clearInterval(intervalId); return; }
        if (scanRoot(document)) return;
        if (scanFrames()) return;
    }

    const observer = new MutationObserver(function(muts){
        if (clicked) return;
        if (observer._scheduled) return;
        observer._scheduled = setTimeout(()=>{ observer._scheduled = 0; scanAndAct(); }, 120);
    });
    observer.observe(document.documentElement || document, { childList: true, subtree: true });

    const intervalId = setInterval(scanAndAct, CONFIG.checkInterval);

    // 可从控制台触发：window.autoNextClick({autoClick:false, hideModal:true})
    window.autoNextClick = function(opts){ if (opts && typeof opts === 'object') Object.assign(CONFIG, opts); CONFIG.autoClick = true; clicked = false; attempts = 0; scanAndAct(); };

    console.log('[AutoNext] started v0.3');

})();
