// ============================================
// 《腌笃鲜》官方维基 - Utilities
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
const _utils = {
  slugify(text) {
    return (
      "sec-" +
      text
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 60) +
      "-" +
      _utils.hashCode(text)
    );
  },

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  },

  debounce(fn, delay = 150) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  throttle(fn) {
    let ticking = false;
    return function (...args) {
      if (!ticking) {
        requestAnimationFrame(() => {
          fn.apply(this, args);
          ticking = false;
        });
        ticking = true;
      }
    };
  },

  inferBlockquoteType(text) {
    const t = text.toLowerCase();
    if (t.includes('警告') || t.includes('危险') || t.includes('失败') || t.includes('错误')) return 'warning';
    if (t.includes('严禁') || t.includes('禁止')) return 'danger';
    if (t.includes('说明') || t.includes('备注') || t.includes('提示') || t.includes('提醒') || t.includes('注意') || t.includes('要点') || t.includes('当前规则')) return 'info';
    if (t.includes('成功') || t.includes('完成') || t.includes('兼容')) return 'success';
    return null;
  }
};

window.XYDZTZ.utils = _utils;
