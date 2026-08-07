// ============================================
// 《腌笃鲜》维基百科 - Current Chapter TOC & Global Search
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.toc = {
  headingsData: [],
  searchIndex: [],
  _searchPromise: null,
  _searchBound: false,
  _searchShortcutBound: false,
  _searchRenderId: 0,

  generate() {
    const main = document.getElementById('main-content');
    const tocList = document.getElementById('toc-list');
    if (!main || !tocList) return;

    const items = Array.from(main.querySelectorAll('h3, h4')).map((heading) => ({
      id: heading.id,
      level: heading.tagName.toLowerCase(),
      text: window.XYDZTZ.utils.headingText(heading),
    }));

    const structure = [];
    let currentH3 = null;
    items.forEach((item) => {
      if (item.level === 'h3') {
        currentH3 = { ...item, children: [] };
        structure.push(currentH3);
      } else if (currentH3) {
        currentH3.children.push(item);
      } else {
        structure.push({ ...item, children: [] });
      }
    });

    /* 章序：与正文 H3 的 data-num 保持一致，章级目录项注入序号 */
    const TOC_NUMERALS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾', '拾壹', '拾贰', '拾叁', '拾肆', '拾伍'];
    let h3Count = 0;
    tocList.innerHTML = structure.map((section, index) => {
      const hasChildren = section.children.length > 0;
      const num = section.level === 'h3' ? ` data-num="${TOC_NUMERALS[h3Count] || h3Count + 1}"` : '';
      if (section.level === 'h3') h3Count += 1;
      return `
        <li class="toc-item toc-section${hasChildren ? ' has-children' : ''}${index === 0 ? ' open' : ''}">
          <a class="toc-link" href="#${encodeURIComponent(section.id)}" data-id="${this.escapeHtml(section.id)}"${num}>${this.escapeHtml(section.text)}</a>
          ${hasChildren ? `
            <ul class="toc-sublist">
              ${section.children.map((child) => `
                <li class="toc-item">
                  <a class="toc-link h4" href="#${encodeURIComponent(child.id)}" data-id="${this.escapeHtml(child.id)}">${this.escapeHtml(child.text)}</a>
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </li>
      `;
    }).join('');

    tocList.querySelectorAll('.toc-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.getElementById(link.dataset.id);
        if (!target) return;
        event.preventDefault();
        this.openForLink(link);
        window.XYDZTZ.ui?.closeMobileSidebar();
        history.pushState(null, '', `#${encodeURIComponent(target.id)}`);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    this.headingsData = items;
  },

  async ensureSearchIndex() {
    if (this.searchIndex.length > 0) return this.searchIndex;
    if (this._searchPromise) return this._searchPromise;

    const url = document.body.dataset.searchIndex || '/search-index.json';
    this._searchPromise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        this.searchIndex = (payload.entries || []).map((item) => {
          const breadcrumb = [item.book, item.chapter, item.parent]
            .filter((part, index, list) => part && list.indexOf(part) === index)
            .join(' › ');
          return {
            ...item,
            breadcrumb,
            headingLower: item.heading.toLowerCase(),
            bodyLower: item.body.toLowerCase(),
            breadcrumbLower: breadcrumb.toLowerCase(),
          };
        });
        return this.searchIndex;
      })
      .catch((err) => {
        this._searchPromise = null;
        console.warn('全站搜索索引加载失败', err);
        throw err;
      });

    return this._searchPromise;
  },

  setupSearch() {
    if (this._searchBound) return;
    const input = document.getElementById('toc-search');
    const tocList = document.getElementById('toc-list');
    if (!input || !tocList) return;

    const results = document.createElement('div');
    results.className = 'toc-search-results';
    results.setAttribute('aria-live', 'polite');
    results.hidden = true;
    tocList.before(results);

    input.addEventListener('focus', () => {
      this.ensureSearchIndex().catch(() => {});
    }, { once: true });

    input.addEventListener('input', window.XYDZTZ.utils.debounce((event) => {
      this.renderSearch(event.target.value.toLowerCase().trim(), results, tocList);
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

    this._searchBound = true;
  },

  async renderSearch(query, results, tocList) {
    const renderId = ++this._searchRenderId;
    if (!query) {
      results.hidden = true;
      results.innerHTML = '';
      tocList.hidden = false;
      tocList.classList.remove('searching');
      this.syncOpenState();
      return;
    }

    tocList.hidden = true;
    tocList.classList.add('searching');
    results.hidden = false;
    results.innerHTML = '<p class="toc-search-count">正在搜索全站…</p>';

    try {
      await this.ensureSearchIndex();
    } catch (err) {
      if (renderId !== this._searchRenderId) return;
      results.innerHTML = '<p class="toc-search-empty">全站搜索暂时不可用</p>';
      return;
    }

    if (renderId !== this._searchRenderId) return;

    const matches = this.searchIndex
      .map((item) => {
        const headingIndex = item.headingLower.indexOf(query);
        const breadcrumbIndex = item.breadcrumbLower.indexOf(query);
        const bodyIndex = item.bodyLower.indexOf(query);
        if (headingIndex < 0 && breadcrumbIndex < 0 && bodyIndex < 0) return null;
        return {
          ...item,
          score: headingIndex === 0 ? 0 : headingIndex > 0 ? 1 : breadcrumbIndex >= 0 ? 2 : 3,
          excerpt: this.createExcerpt(item.body || item.heading, query),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .slice(0, 12);

    if (matches.length === 0) {
      results.innerHTML = '<p class="toc-search-empty">没有找到相关内容</p>';
      return;
    }

    results.innerHTML = `
      <p class="toc-search-count">全站相关章节 ${matches.length} 项</p>
      <ul>
        ${matches.map((item) => `
          <li>
            <a class="toc-search-result" href="${this.escapeHtml(item.url)}" data-id="${this.escapeHtml(item.id)}">
              <small>${this.escapeHtml(item.breadcrumb)}</small>
              <strong>${this.highlightText(item.heading, query)}</strong>
              <span>${this.highlightText(item.excerpt, query)}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    `;

    results.querySelectorAll('.toc-search-result').forEach((link) => {
      link.addEventListener('click', (event) => {
        window.XYDZTZ.ui?.closeMobileSidebar();
        const destination = new URL(link.href, location.href);
        const samePage = destination.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '');
        const target = samePage ? document.getElementById(link.dataset.id) : null;
        if (!target) return;

        event.preventDefault();
        history.pushState(null, '', destination.hash || `#${encodeURIComponent(target.id)}`);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  },

  async resolveAnchor(hash) {
    try {
      const index = await this.ensureSearchIndex();
      const match = index.find((item) => item.id === hash || item.legacyId === hash);
      return match?.url || '';
    } catch (err) {
      return '';
    }
  },

  openForLink(link) {
    const section = link.closest('.toc-section');
    if (!section) return;

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
    document.querySelector('.toc-section')?.classList.add('open');
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
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
    return html + this.escapeHtml(text.slice(lastIndex));
  },

  escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  escapeHtml(text) {
    return window.XYDZTZ.utils.escapeHtml(text);
  },
};
