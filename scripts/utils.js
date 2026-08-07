// ============================================
// 《腌笃鲜》维基百科 - Utilities
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
const _utils = {
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

  siteAsset(path) {
    const value = String(path || '');
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith('/')) return value;
    return `/${value.replace(/^\.\//, '')}`;
  }
};

window.XYDZTZ.utils = _utils;

// V1: HTML 转义（供各模块安全拼接文本）
_utils.escapeHtml = function (text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
};

// 取标题纯文本：剔除标题内嵌的交互元素（如 FAQ「展开全部」按钮），
// 避免按钮文案污染目录、浏览器标题栏与阅读位置指示
_utils.headingText = function (el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('button').forEach((btn) => btn.remove());
  return clone.textContent.trim();
};
