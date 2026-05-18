// ============================================
// 《腌笃鲜》官方维基 - Table of Contents
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.toc = {
  headingsData: [],

  generate() {
    const main = document.getElementById('main-content');
    const tocList = document.getElementById('toc-list');
    if (!main || !tocList) return;

    const headings = main.querySelectorAll('h1, h2, h3');
    const items = [];

    headings.forEach((heading, index) => {
      const id = heading.id || window.XYDZTZ.utils.slugify(heading.textContent);
      if (!heading.id) heading.id = id;

      const level = heading.tagName.toLowerCase();
      const text = heading.textContent.trim();

      // 跳过第一个 h1（与 Hero 标题重复）
      if (level === 'h1' && index === 0) return;

      items.push({ id, level, text });
    });

    // 构建层级结构
    let currentH1 = null;
    const structure = [];

    items.forEach((item) => {
      if (item.level === 'h1') {
        currentH1 = { ...item, children: [] };
        structure.push(currentH1);
      } else if (currentH1) {
        currentH1.children.push(item);
      } else {
        structure.push(item);
      }
    });

    // 渲染
    let html = '';
    structure.forEach((section, index) => {
      const hasChildren = section.children && section.children.length > 0;
      const itemClass = `toc-item toc-section${hasChildren ? ' has-children' : ''}${index === 0 ? ' open' : ''}`;
      html += `<li class="${itemClass}" data-text="${section.text.toLowerCase()}">`;
      html += `<a class="toc-link" href="#${section.id}" data-id="${section.id}">${this.escapeHtml(section.text)}</a>`;

      if (hasChildren) {
        html += '<ul class="toc-sublist">';
        section.children.forEach((child) => {
          html += `<li class="toc-item" data-text="${child.text.toLowerCase()}">`;
          html += `<a class="toc-link ${child.level === 'h3' ? 'h3' : ''}" href="#${child.id}" data-id="${child.id}">${this.escapeHtml(child.text)}</a>`;
          html += '</li>';
        });
        html += '</ul>';
      }

      html += '</li>';
    });

    tocList.innerHTML = html;

    // 绑定点击平滑滚动
    tocList.querySelectorAll('.toc-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-id');
        const target = document.getElementById(targetId);
        if (target) {
          this.openForLink(link);
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.XYDZTZ.ui?.closeMobileSidebar();
        }
      });
    });

    // 保存数据用于搜索
    this.headingsData = items;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  setupSearch() {
    const input = document.getElementById('toc-search');
    const tocList = document.getElementById('toc-list');
    if (!input || !tocList) return;

    const noResults = document.createElement('div');
    noResults.className = 'toc-no-results';
    noResults.textContent = '无匹配结果';
    tocList.parentNode.insertBefore(noResults, tocList.nextSibling);

    input.addEventListener('input', window.XYDZTZ.utils.debounce((e) => {
      const query = e.target.value.toLowerCase().trim();
      this.filterTOC(query, noResults);
    }, 150));
  },

  filterTOC(query, noResultsEl) {
    const tocList = document.getElementById('toc-list');
    const items = tocList.querySelectorAll('.toc-item');

    // 空查询：全部显示
    if (query === '') {
      items.forEach((item) => item.classList.remove('hidden'));
      tocList.classList.remove('searching');
      this.syncOpenState();
      noResultsEl.classList.remove('visible');
      return;
    }

    tocList.classList.add('searching');

    // 第一轮：收集自身匹配的项
    const matched = new Set();
    items.forEach((item) => {
      const text = item.getAttribute('data-text') || '';
      if (text.includes(query)) {
        matched.add(item);
      }
    });

    // 第二轮：确保子项匹配时，其祖先父项也显示
    matched.forEach((item) => {
      let parent = item.parentElement?.closest('.toc-item');
      while (parent) {
        matched.add(parent);
        parent.classList.add('open');
        parent = parent.parentElement?.closest('.toc-item');
      }
    });

    // 应用显示/隐藏
    let hasVisible = false;
    items.forEach((item) => {
      if (matched.has(item)) {
        item.classList.remove('hidden');
        hasVisible = true;
      } else {
        item.classList.add('hidden');
      }
    });

    // 如果目录无结果，尝试在正文中搜索并提示
    if (!hasVisible) {
      const contentMatch = this.searchInContent(query);
      if (contentMatch) {
        noResultsEl.innerHTML = `找到相关章节：<a href="#${contentMatch.id}" style="color:var(--accent-fire)">${this.escapeHtml(contentMatch.text)}</a>`;
        noResultsEl.classList.add('visible');
        const link = noResultsEl.querySelector('a');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(contentMatch.id);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              window.XYDZTZ.ui?.closeMobileSidebar();
            }
          });
        }
        return;
      }
    }

    noResultsEl.classList.remove('visible');
  },

  openForLink(link) {
    const section = link.closest('.toc-section');
    if (!section) return;

    const tocList = document.getElementById('toc-list');
    if (tocList?.classList.contains('searching')) return;

    document.querySelectorAll('.toc-section.open').forEach((item) => {
      if (item !== section) item.classList.remove('open');
    });
    section.classList.add('open');
  },

  syncOpenState() {
    const active = document.querySelector('.toc-link.active');
    if (active) {
      this.openForLink(active);
      return;
    }

    const first = document.querySelector('.toc-section');
    if (first) first.classList.add('open');
  },

  /* 在正文 heading 及其后续段落中搜索 */
  searchInContent(query) {
    const main = document.getElementById('main-content');
    if (!main) return null;

    const headings = main.querySelectorAll('h1, h2, h3, h4');
    for (const h of headings) {
      if (h.textContent.toLowerCase().includes(query)) {
        return { id: h.id, text: h.textContent.trim() };
      }

      // 检查 heading 后面的段落
      let sibling = h.nextElementSibling;
      let count = 0;
      while (sibling && count < 10) {
        if (/^H[1-6]$/i.test(sibling.tagName)) break;
        if (sibling.textContent.toLowerCase().includes(query)) {
          return { id: h.id, text: h.textContent.trim() };
        }
        sibling = sibling.nextElementSibling;
        count++;
      }
    }
    return null;
  }
};
