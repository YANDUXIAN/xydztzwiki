// ============================================
// 《腌笃鲜》维基百科 - Scroll Features
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.scroll = {
  _currentActiveId: null,
  _headings: [],
  _lastHash: '',
  _scrollTicking: false,
  _hero: null,
  _backToTop: null,
  _progressBar: null,
  _baseTitle: '',

  init() {
    this._hero = document.getElementById('hero');
    this._backToTop = document.getElementById('back-to-top');
    this._progressBar = document.getElementById('read-progress');
    this._positionBar = document.getElementById('reading-position');
    this._positionNum = this._positionBar?.querySelector('.rp-num') || null;
    this._positionTitle = this._positionBar?.querySelector('.rp-title') || null;
    this._baseTitle = document.title;
    try {
      this._lastHash = decodeURIComponent(location.hash.slice(1));
    } catch (err) {
      this._lastHash = location.hash.slice(1);
    }

    this.setupScrollSpy();
    this.setupBackToTop();
    this.setupReveal();
    this.setupViewportLoop();
  },

  setupReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const main = document.getElementById('main-content');
    if (!main) return;

    const children = Array.from(main.children).slice(0, 18);
    if (children.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
    );

    children.forEach((element) => {
      element.classList.add('reveal');
      observer.observe(element);
    });
  },

  setupScrollSpy() {
    const tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length === 0 || !('IntersectionObserver' in window)) return;

    const visible = new Set();
    this._headings = Array.from(tocLinks).map((link) => {
      const id = link.dataset.id;
      const element = document.getElementById(id);
      return element ? { id, el: element, link } : null;
    }).filter(Boolean);

    if (this._headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        const active = this._headings.find((heading) => visible.has(heading.id));
        if (!active) return;

        this.setActive(active.id);
        const syncStart = Math.max(0, (this._hero?.offsetHeight || 0) - 80);
        if (window.scrollY >= syncStart && active.id !== this._lastHash) {
          this._lastHash = active.id;
          history.replaceState(null, '', `#${encodeURIComponent(active.id)}`);
        }
      },
      { rootMargin: '-72px 0px -55% 0px', threshold: 0.05 }
    );

    this._headings.forEach((heading) => observer.observe(heading.el));
  },

  setActive(activeId) {
    if (activeId === this._currentActiveId) return;
    this._currentActiveId = activeId;

    document.querySelector('.toc-link.active')?.classList.remove('active');
    const active = this._headings.find((heading) => heading.id === activeId);
    if (!active) return;

    active.link.classList.add('active');
    window.XYDZTZ.toc?.openForLink(active.link);

    const sectionTitle = window.XYDZTZ.utils.headingText(active.el);
    const chapterTitle = document.body.dataset.chapterTitle || '';
    const bookTitle = document.body.dataset.bookTitle || '';
    const siteTitle = '《腌笃鲜》';
    const nextTitle = [sectionTitle, chapterTitle, bookTitle, siteTitle]
      .filter((part, index, list) => part && list.indexOf(part) === index)
      .join(' | ');
    if (document.title !== nextTitle) document.title = nextTitle;
    this.updateReadingPosition(active.el);
  },

  // 当前位置指示：H3 直接显示；H4 回溯所属章并附小节名；null（回到页首）时隐藏
  updateReadingPosition(headingEl) {
    if (!this._positionBar) return;
    let chapterEl = headingEl || null;
    if (chapterEl && chapterEl.tagName !== 'H3') {
      let node = chapterEl.previousElementSibling;
      while (node && node.tagName !== 'H3' && node.tagName !== 'H2') {
        node = node.previousElementSibling;
      }
      chapterEl = node && node.tagName === 'H3' ? node : null;
    }
    if (!chapterEl) {
      this._positionBar.classList.remove('visible');
      return;
    }
    const num = chapterEl.dataset.num || '';
    const chapterTitle = window.XYDZTZ.utils.headingText(chapterEl);
    const isSub = headingEl !== chapterEl;
    if (this._positionNum) this._positionNum.textContent = num ? `第${num}章` : '';
    if (this._positionTitle) {
      this._positionTitle.textContent = isSub
        ? `${chapterTitle} › ${window.XYDZTZ.utils.headingText(headingEl)}`
        : chapterTitle;
    }
    this._positionBar.classList.add('visible');
  },

  setupBackToTop() {
    this._backToTop?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  setupViewportLoop() {
    const requestUpdate = () => {
      if (this._scrollTicking) return;
      this._scrollTicking = true;
      requestAnimationFrame(() => {
        this.updateViewport();
        this._scrollTicking = false;
      });
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    requestUpdate();
  },

  updateViewport() {
    const scrollTop = window.scrollY;
    this._backToTop?.classList.toggle('visible', scrollTop > 480);

    if (this._progressBar) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      this._progressBar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
    }

    if (!this._hero || scrollTop >= this._hero.offsetHeight * 0.45) return;
    document.querySelector('.toc-link.active')?.classList.remove('active');
    this._currentActiveId = null;
    document.title = this._baseTitle;
    this.updateReadingPosition(null);
  },
};
