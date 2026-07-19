// ============================================
// 《腌笃鲜》官方维基 - Scroll Features
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.scroll = {
  _currentActiveId: null,

  init() {
    this.setupScrollSpy();
    this.setupBackToTop();
    this.setupReadProgress();
    this.setupReveal();
  },

  setupReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const main = document.getElementById('main-content');
    if (!main) return;

    const children = Array.from(main.children);
    if (children.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
    );

    children.forEach((el) => {
      el.classList.add('reveal');
      observer.observe(el);
    });
  },

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

    let lastHash = location.hash.slice(1);
    const hero = document.getElementById('hero');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        let activeId = null;
        for (const h of headings) {
          if (visible.has(h.id)) {
            activeId = h.id;
            break;
          }
        }

        if (!activeId) return;
        this.setActive(activeId, headings);

        // Hero 可见时保留首页地址，避免首次加载立即写入锚点。
        const syncStart = Math.max(0, (hero?.offsetHeight || 0) - 80);
        if (window.scrollY >= syncStart && activeId !== lastHash) {
          lastHash = activeId;
          history.replaceState(null, '', `#${activeId}`);
        }
      },
      { rootMargin: '0px 0px -55% 0px', threshold: 0.05 }
    );

    headings.forEach((h) => observer.observe(h.el));

    const resetAtTop = window.XYDZTZ.utils.throttle(() => {
      if (!hero || window.scrollY >= hero.offsetHeight * 0.45) return;

      const active = document.querySelector('.toc-link.active');
      if (active) active.classList.remove('active');
      this._currentActiveId = null;
      document.title = '《腌笃鲜》官方维基';

      if (location.hash) {
        lastHash = '';
        history.replaceState(null, '', `${location.pathname}${location.search}`);
      }
    });

    window.addEventListener('scroll', resetAtTop, { passive: true });
  },

  setActive(activeId, headings) {
    if (activeId === this._currentActiveId) return;
    this._currentActiveId = activeId;

    const oldLink = document.querySelector('.toc-link.active');
    if (oldLink) oldLink.classList.remove('active');

    const newHeading = headings.find((h) => h.id === activeId);
    if (newHeading) {
      newHeading.link.classList.add('active');
      window.XYDZTZ.toc?.openForLink(newHeading.link);

      const sectionTitle = newHeading.el.textContent.trim();
      const baseTitle = '《腌笃鲜》官方维基';
      if (sectionTitle) {
        const newTitle = `${sectionTitle} | ${baseTitle}`;
        if (document.title !== newTitle) {
          document.title = newTitle;
        }
      }
    }
  },

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
