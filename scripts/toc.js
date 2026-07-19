// ============================================
// 《腌笃鲜》官方维基 - Table of Contents
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.toc = {
  headingsData: [],
  searchIndex: [],

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

      // Hero 已展示站点标题，目录不再重复第一项。
      if (level === 'h1' && index === 0) return;

      items.push({ id, level, text });
    });

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

    tocList.querySelectorAll('.toc-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-id');
        const target = document.getElementById(targetId);
        if (target) {
          this.openForLink(link);
          window.XYDZTZ.ui?.closeMobileSidebar();
          requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      });
    });

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

    this.searchIndex = this.buildSearchIndex();
    const results = document.createElement('div');
    results.className = 'toc-search-results';
    results.setAttribute('aria-live', 'polite');
    results.hidden = true;
    tocList.before(results);

    input.addEventListener('input', window.XYDZTZ.utils.debounce((e) => {
      const query = e.target.value.toLowerCase().trim();
      this.renderSearch(query, results, tocList);
    }, 120));

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !input.value) return;
      event.stopPropagation();
      input.value = '';
      this.renderSearch('', results, tocList);
    });

    if (!this._searchShortcutBound) {
      document.addEventListener('keydown', (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
        event.preventDefault();
        if (window.matchMedia('(max-width: 768px)').matches) {
          window.XYDZTZ.ui?.openMobileSidebar();
        }
        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });
      });
      this._searchShortcutBound = true;
    }
  },

  renderSearch(query, results, tocList) {
    if (!query) {
      results.hidden = true;
      results.innerHTML = '';
      tocList.hidden = false;
      tocList.classList.remove('searching');
      this.syncOpenState();
      return;
    }

    const matches = this.searchIndex
      .map((item) => {
        const headingIndex = item.headingLower.indexOf(query);
        const bodyIndex = item.bodyLower.indexOf(query);
        if (headingIndex < 0 && bodyIndex < 0) return null;
        return {
          ...item,
          score: headingIndex === 0 ? 0 : headingIndex > 0 ? 1 : 2,
          excerpt: this.createExcerpt(item.body || item.heading, query),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .slice(0, 10);

    tocList.hidden = true;
    results.hidden = false;

    if (matches.length === 0) {
      results.innerHTML = '<p class="toc-search-empty">没有找到相关内容</p>';
      return;
    }

    results.innerHTML = `
      <p class="toc-search-count">相关章节 ${matches.length} 项</p>
      <ul>
        ${matches.map((item) => `
          <li>
            <a class="toc-search-result" href="#${item.id}" data-id="${item.id}">
              <strong>${this.highlightText(item.heading, query)}</strong>
              <span>${this.highlightText(item.excerpt, query)}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    `;

    results.querySelectorAll('.toc-search-result').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const target = document.getElementById(link.dataset.id);
        if (!target) return;
        window.XYDZTZ.ui?.closeMobileSidebar();
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', `#${link.dataset.id}`);
        });
      });
    });
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

  buildSearchIndex() {
    const main = document.getElementById('main-content');
    if (!main) return [];

    return Array.from(main.querySelectorAll('h1, h2, h3, h4')).map((heading, order) => {
      const chunks = [];
      let sibling = heading.nextElementSibling;
      while (sibling && !sibling.matches('h1, h2, h3, h4')) {
        chunks.push(sibling.textContent);
        sibling = sibling.nextElementSibling;
      }

      const headingText = heading.textContent.trim();
      const body = chunks.join(' ').replace(/\s+/g, ' ').trim();
      return {
        id: heading.id,
        heading: headingText,
        headingLower: headingText.toLowerCase(),
        body,
        bodyLower: body.toLowerCase(),
        order,
      };
    });
  },

  createExcerpt(text, query) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const index = normalized.toLowerCase().indexOf(query);
    if (index < 0) return normalized.slice(0, 76);

    const start = Math.max(0, index - 24);
    const end = Math.min(normalized.length, index + query.length + 48);
    return `${start > 0 ? '…' : ''}${normalized.slice(start, end)}${end < normalized.length ? '…' : ''}`;
  },

  highlightText(text, query) {
    if (!query) return this.escapeHtml(text);
    const pattern = new RegExp(this.escapeRegExp(query), 'ig');
    let html = '';
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      html += this.escapeHtml(text.slice(lastIndex, match.index));
      html += `<mark>${this.escapeHtml(match[0])}</mark>`;
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) pattern.lastIndex++;
    }
    return html + this.escapeHtml(text.slice(lastIndex));
  },

  escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
};
