// ============================================
// 《腌笃鲜》官方维基 - UI Interactions
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.ui = {
  init() {
    this.setupMobileSidebar();
    this.setupHeroButton();
    this.initHeroParallax();
    this.setupThemeToggle();
  },

  /* --- Mobile Sidebar --- */
  setupMobileSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');

    if (toggle) {
      toggle.addEventListener('click', () => {
        const isOpen = sidebar?.classList.toggle('open');
        overlay?.classList.toggle('visible');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileSidebar());
    }
  },

  closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  },

  /* --- Hero Button Scroll --- */
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

  /* --- Hero Parallax & Background Transition --- */
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

    // 平滑缓动循环：消除 mouseenter 瞬间的跳变
    function animateParallax() {
      const ease = 0.06; // 缓动系数，越小越丝滑
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

      // 只更新目标值，实际位移由 rAF 平滑追过去
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

  /* --- Theme Toggle Button --- */
  setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window.XYDZTZ.theme?.toggle();
    });
  },

  /* --- Code Block Copy Buttons --- */
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
