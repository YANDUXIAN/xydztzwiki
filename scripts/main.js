// ============================================
// 《腌笃鲜》官方维基 - Main Entry
// ============================================

window.XYDZTZ = window.XYDZTZ || {};

(function () {
  'use strict';

  const MD_URL = './content.md';
  const CACHE_KEY = 'xydztz_content_v3';
  const CACHE_TIME_KEY = 'xydztz_content_time_v3';

  async function fetchContent() {
    const cached = localStorage.getItem(CACHE_KEY);

    try {
      const headers = {};
      const cachedTime = cached ? localStorage.getItem(CACHE_TIME_KEY) : null;
      if (cachedTime) headers['If-Modified-Since'] = cachedTime;

      const resp = await fetch(MD_URL, { headers });

      if (resp.status === 304 && cached) {
        return cached;
      }

      if (resp.ok) {
        const text = await resp.text();
        localStorage.setItem(CACHE_KEY, text);
        localStorage.setItem(CACHE_TIME_KEY, new Date().toUTCString());
        return text;
      }

      throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
      if (cached) {
        console.warn('《腌笃鲜》网络请求失败，使用缓存内容', err);
        return cached;
      }
      throw err;
    }
  }

  async function init() {
    const main = document.getElementById('main-content');

    try {
      const mdText = await fetchContent();

      // 1. 渲染 Markdown
      window.XYDZTZ.renderer?.render(mdText);

      // 2. 生成目录
      window.XYDZTZ.toc?.generate();
      window.XYDZTZ.toc?.setupSearch();

      // 3. 滚动相关
      window.XYDZTZ.scroll?.init();

      // 4. UI 交互
      window.XYDZTZ.ui?.init();

      // 5. 主题
      window.XYDZTZ.theme?.init();

      // 6. 处理页面初始 hash 跳转
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1));
        if (target) {
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    } catch (err) {
      console.error('《腌笃鲜》初始化失败:', err);
      if (main) {
        main.innerHTML = `
          <div class="loading">
            <p style="color:var(--text-secondary)">文档加载失败，请刷新页面重试</p>
            <p style="color:var(--color-danger);font-size:13px;margin-top:8px">${err.message}</p>
          </div>
        `;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
