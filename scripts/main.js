// ============================================
// 《腌笃鲜》维基百科 - Main Entry
// ============================================

window.XYDZTZ = window.XYDZTZ || {};

(function () {
  'use strict';

  function readHash() {
    const value = location.hash.slice(1);
    try {
      return decodeURIComponent(value);
    } catch (err) {
      return value;
    }
  }

  function findLocalTarget(hash) {
    if (!hash) return null;
    const direct = document.getElementById(hash);
    if (direct) return direct;
    return Array.from(document.querySelectorAll('[data-legacy-id]'))
      .find((element) => element.dataset.legacyId === hash) || null;
  }

  async function resolveInitialAnchor() {
    const hash = readHash();
    if (!hash) return;

    const target = findLocalTarget(hash);
    if (target) {
      if (target.id && target.id !== hash) {
        history.replaceState(null, '', `#${encodeURIComponent(target.id)}`);
      }
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'start' });
      });
      return;
    }

    const crossPageUrl = await window.XYDZTZ.toc?.resolveAnchor(hash);
    if (crossPageUrl) location.replace(crossPageUrl);
  }

  function restoreHistoryAnchor() {
    const target = findLocalTarget(readHash());
    if (target) target.scrollIntoView({ block: 'start' });
  }

  async function stabilizeHistoryAnchor() {
    const hash = readHash();
    if (!hash) return;

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    if (readHash() !== hash) return;
    restoreHistoryAnchor();

    if (document.fonts?.ready) {
      await document.fonts.ready;
      if (readHash() === hash) restoreHistoryAnchor();
    }
  }

  function waitForWindowLoad() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      window.addEventListener('load', resolve, { once: true });
    });
  }

  async function init() {
    const main = document.getElementById('main-content');
    if (!main) return;

    window.XYDZTZ.theme?.init();
    window.XYDZTZ.ui?.init();
    window.XYDZTZ.renderer?.enhance(main);

    window.XYDZTZ.toc?.generate();
    window.XYDZTZ.toc?.setupSearch();
    window.XYDZTZ.scroll?.init();

    // 媒体清单不阻塞目录、搜索和深链；注入完成后再校正一次锚点位置。
    const mediaReady = Promise.resolve(window.XYDZTZ.media?.init());
    const windowReady = waitForWindowLoad();
    await resolveInitialAnchor();
    Promise.all([mediaReady, windowReady]).then(stabilizeHistoryAnchor).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('popstate', restoreHistoryAnchor);
})();
