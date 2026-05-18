// ============================================
// 《腌笃鲜》官方维基 - Utilities
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
const _utils = {
  /**
   * 将文本转为 URL 友好的 slug
   */
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

  /**
   * 简单字符串哈希
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  },

  /**
   * 防抖函数
   */
  debounce(fn, delay = 150) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * 节流函数（使用 rAF）
   */
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

  /**
   * 从 blockquote 文本推断类型
   */
  inferBlockquoteType(text) {
    const t = text.toLowerCase();
    if (t.includes('警告') || t.includes('危险') || t.includes('失败') || t.includes('错误')) return 'warning';
    if (t.includes('说明') || t.includes('备注') || t.includes('提示') || t.includes('注意')) return 'info';
    if (t.includes('成功') || t.includes('完成') || t.includes('兼容')) return 'success';
    if (t.includes('严禁') || t.includes('禁止')) return 'danger';
    return null;
  }
};

window.XYDZTZ.utils = _utils;
