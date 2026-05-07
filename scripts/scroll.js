// ============================================
// 腌笃鲜 (XYDZTZ) 官方维基 - Scroll Features
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.scroll = {
  _currentActiveId: null,

  init() {
    this.setupScrollSpy();
    this.setupBackToTop();
    this.setupReadProgress();
  },

  /* --- IntersectionObserver ScrollSpy + Anchor Sync --- */
  setupScrollSpy() {
    const tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length === 0) return;

    const visible = new Set();
    const headings = [];

    tocLinks.forEach((link) => {
      const id = link.getAttribute('data-id');
      const el = document.getElementById(id);
      if (el) headings.push({ id, el, link });
    });

    if (headings.length === 0) return;

    // 默认激活第一个
    this.setActive(headings[0].id, headings);

    let lastHash = '';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        // ScrollSpy：按 DOM 顺序取第一个可见 heading
        for (const h of headings) {
          if (visible.has(h.id)) {
            this.setActive(h.id, headings);
            break;
          }
        }

        // Anchor Sync：同步更新 URL hash（不污染历史记录）
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id && id !== lastHash) {
              lastHash = id;
              history.replaceState(null, null, `#${id}`);
            }
          }
        });
      },
      { rootMargin: '0px 0px -55% 0px', threshold: 0.05 }
    );

    headings.forEach((h) => observer.observe(h.el));
  },

  setActive(activeId, headings) {
    if (activeId === this._currentActiveId) return;
    this._currentActiveId = activeId;

    // 只更新真正变化的链接
    const oldLink = document.querySelector('.toc-link.active');
    if (oldLink) oldLink.classList.remove('active');

    const newHeading = headings.find((h) => h.id === activeId);
    if (newHeading) {
      newHeading.link.classList.add('active');
      window.XYDZTZ.toc?.openForLink(newHeading.link);

      // 更新页面标题
      const sectionTitle = newHeading.el.textContent.trim();
      const baseTitle = '腌笃鲜 (XYDZTZ) 官方维基';
      if (sectionTitle) {
        const newTitle = `${sectionTitle} | ${baseTitle}`;
        if (document.title !== newTitle) {
          document.title = newTitle;
        }
      }
    }
  },

  /* --- Back to Top --- */
  setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    const onScroll = window.XYDZTZ.utils.throttle(() => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });

    window.addEventListener('scroll', onScroll, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  /* --- Reading Progress Bar --- */
  setupReadProgress() {
    const bar = document.getElementById('read-progress');
    if (!bar) return;

    const onScroll = window.XYDZTZ.utils.throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${Math.min(progress, 100)}%`;
    });

    window.addEventListener('scroll', onScroll, { passive: true });
  }
};
