// ============================================
// 《腌笃鲜》官方维基 - UI Interactions
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.ui = {
  _mobileQuery: null,

  init() {
    this.setupMobileSidebar();
    this.setupHeroButton();
    this.initHeroParallax();
    this.initHeroParticles();
    this.setupThemeToggle();
  },

  setupMobileSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;

    this._mobileQuery = window.matchMedia('(max-width: 768px)');

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) this.closeMobileSidebar();
      else this.openMobileSidebar();
    });

    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileSidebar());
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('open')) {
        this.closeMobileSidebar(true);
      }
    });

    const syncMode = () => {
      if (this._mobileQuery.matches) {
        const isOpen = sidebar.classList.contains('open');
        sidebar.inert = !isOpen;
        sidebar.setAttribute('aria-hidden', String(!isOpen));
      } else {
        sidebar.classList.remove('open');
        overlay?.classList.remove('visible');
        sidebar.inert = false;
        sidebar.removeAttribute('aria-hidden');
        document.body.classList.remove('sidebar-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', '打开目录');
      }
    };

    this._mobileQuery.addEventListener?.('change', syncMode);
    syncMode();
  },

  openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.inert = false;
    sidebar.removeAttribute('aria-hidden');
    sidebar.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('visible');
    document.body.classList.add('sidebar-open');

    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', '关闭目录');
    }

    requestAnimationFrame(() => document.getElementById('toc-search')?.focus());
  },

  closeMobileSidebar(restoreFocus = false) {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
    document.body.classList.remove('sidebar-open');

    if (sidebar && this._mobileQuery?.matches) {
      sidebar.inert = true;
      sidebar.setAttribute('aria-hidden', 'true');
    }

    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开目录');
      if (restoreFocus) toggle.focus();
    }
  },

  setupHeroButton() {
    const btn = document.getElementById('hero-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const main = document.getElementById('main-content');
      const firstHeading = main?.querySelector('h1, h2, h3');
      if (firstHeading) {
        firstHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
      }
    });
  },

  initHeroParallax() {
    const hero = document.getElementById('hero');
    if (!hero || window.matchMedia('(pointer: coarse)').matches) return;

    const defaultBg = hero.querySelector('.hero-bg-default');
    const hoverBg = hero.querySelector('.hero-bg-hover');
    if (!defaultBg || !hoverBg) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isHovering = false;
    let rafId = null;

    function animateParallax() {
      const ease = 0.06;
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      const threshold = 0.02;
      const settled =
        Math.abs(targetX - currentX) < threshold &&
        Math.abs(targetY - currentY) < threshold;

      if (!isHovering && settled) {
        currentX = targetX;
        currentY = targetY;
        hero.style.setProperty('--parallax-x', '0px');
        hero.style.setProperty('--parallax-y', '0px');
        rafId = null;
        return;
      }

      hero.style.setProperty('--parallax-x', `${currentX.toFixed(2)}px`);
      hero.style.setProperty('--parallax-y', `${currentY.toFixed(2)}px`);
      rafId = requestAnimationFrame(animateParallax);
    }

    function startLoop() {
      if (!rafId) rafId = requestAnimationFrame(animateParallax);
    }

    hero.addEventListener('mouseenter', () => {
      isHovering = true;
      hero.classList.add('is-hover');
      startLoop();
    });

    hero.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const xPos = (clientX / innerWidth - 0.5) * 2;
      const yPos = (clientY / innerHeight - 0.5) * 2;

      targetX = xPos * -8;
      targetY = yPos * -6;
    });

    hero.addEventListener('mouseleave', () => {
      isHovering = false;
      hero.classList.remove('is-hover');
      targetX = 0;
      targetY = 0;
      startLoop(); // 确保回到 0 的动画能执行完
    });
  },

  initHeroParticles() {
    const hero = document.getElementById('hero');
    const canvas = document.getElementById('hero-particles');
    if (!hero || !canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 触屏设备没有悬停态，直接使用暖色粒子。
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const COUNT = 42;
    const particles = [];
    const rand = (min, max) => min + Math.random() * (max - min);
    const lerp = (a, b, t) => a + (b - a) * t;

    let width = 0;
    let height = 0;
    let rafId = null;
    let warm = 0;

    function resize() {
      width = hero.clientWidth;
      height = hero.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(p) {
      p.x = rand(0, width);
      p.y = rand(-height * 0.2, 0);
      p.r = rand(1, 2.6);
      p.speed = rand(0.3, 0.9);
      p.drift = rand(-0.25, 0.25);
      p.phase = rand(0, Math.PI * 2);
      p.spin = rand(0.005, 0.02);
      p.alpha = rand(0.35, 0.8);
    }

    resize();
    for (let i = 0; i < COUNT; i++) {
      const p = {};
      spawn(p);
      p.y = rand(0, height);
      particles.push(p);
    }

    function tick() {
      ctx.clearRect(0, 0, width, height);

      const target = coarse || hero.classList.contains('is-hover') ? 1 : 0;
      warm += (target - warm) * 0.02;

      for (const p of particles) {
        p.phase += p.spin;
        p.y += p.speed;
        p.x += p.drift + Math.sin(p.phase) * 0.3;

        if (p.y > height + 4) { spawn(p); p.y = -4; }
        if (p.x < -4) p.x = width + 4;
        if (p.x > width + 4) p.x = -4;

        const r = Math.round(lerp(255, 236, warm));
        const g = Math.round(lerp(255, 200, warm));
        const b = Math.round(lerp(255, 150, warm));
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * lerp(0.7, 0.9, warm)})`;

        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * lerp(1, 1.8, warm), p.r, p.phase, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('resize', window.XYDZTZ.utils.throttle(resize));

    // Hero 离屏时暂停动画，避免持续占用渲染资源。
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!rafId) rafId = requestAnimationFrame(tick);
          } else if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        });
      });
      io.observe(hero);
    } else {
      rafId = requestAnimationFrame(tick);
    }
  },

  setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window.XYDZTZ.theme?.toggle();
    });
  },

  initCodeBlocks() {
    const pres = document.querySelectorAll('.md-body pre');
    pres.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = '复制';
      btn.setAttribute('aria-label', '复制代码');

      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        if (!code) return;
        const text = code.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '已复制';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '复制';
            btn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          btn.textContent = '失败';
          setTimeout(() => {
            btn.textContent = '复制';
          }, 2000);
        });
      });

      pre.appendChild(btn);
    });
  }
};
