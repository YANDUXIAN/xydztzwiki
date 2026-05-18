// ============================================
// 《腌笃鲜》官方维基 - Theme (Dark Mode)
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.theme = {
  STORAGE_KEY: 'xdyztz-theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    this.apply(theme);

    // 监听系统主题变化（仅在用户未手动设置时）
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.apply(e.matches ? 'dark' : 'light');
      }
    });
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateIcon(theme);
    this.updateMetaThemeColor(theme);
  },

  updateMetaThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', theme === 'dark' ? '#15110e' : '#faf8f3');
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.apply(next);
    localStorage.setItem(this.STORAGE_KEY, next);
  },

  updateIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    // 太阳图标 = 当前是深色模式，点击切换为浅色
    // 月亮图标 = 当前是浅色模式，点击切换为深色
    if (theme === 'dark') {
      btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000 1.41.996.996 0 001.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06z"/></svg>`;
      btn.setAttribute('aria-label', '切换为浅色模式');
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2c-1.05 0-2.05.16-3 .46 1.69 1.24 2.79 3.26 2.79 5.54 0 3.87-3.13 7-7 7-.57 0-1.13-.08-1.67-.22C2.52 18.49 6.45 22 11 22c5.52 0 10-4.48 10-10S16.52 2 11 2c-.66 0-1.3.07-1.92.19C9.23 2.06 9.12 2 9 2z"/></svg>`;
      btn.setAttribute('aria-label', '切换为深色模式');
    }
  }
};
