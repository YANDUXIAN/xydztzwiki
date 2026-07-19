// ============================================
// 《腌笃鲜》官方维基 - Markdown Renderer
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.renderer = {
  render(text) {
    const main = document.getElementById('main-content');
    if (typeof marked === 'undefined') {
      main.innerHTML = '<p>Markdown 解析器加载失败</p>';
      return;
    }

    try {
      const renderer = new marked.Renderer();
      const { slugify, inferBlockquoteType } = window.XYDZTZ.utils;

      renderer.heading = function (text, depth, raw) {
        const id = slugify(text);
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      };

      renderer.table = function (header, body) {
        let html = '<div class="table-outer"><div class="table-wrapper"><table>';
        if (header) html += header;
        if (body) html += body;
        html += '</table></div></div>';
        return html;
      };

      renderer.blockquote = function (quote) {
        const temp = document.createElement('div');
        temp.innerHTML = quote;
        const plainText = temp.textContent || '';
        if (plainText.trim().startsWith('检索标签')) {
          return `<blockquote class="bq-search-tags" aria-hidden="true">${quote}</blockquote>`;
        }

        const type = inferBlockquoteType(plainText);
        const cls = type ? ` bq-${type}` : '';
        return `<blockquote class="${cls}">${quote}</blockquote>`;
      };

      marked.setOptions({
        renderer: renderer,
        gfm: true,
        breaks: false,
      });

      const html = marked.parse(text);
      main.innerHTML = html;
      this.initUpdateSummary(main);
      this.initJieyunLookup(main);
      this.initFaq(main);
      this.decorateContent(main);

      if (typeof hljs !== 'undefined') {
        main.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }

      this.initTableScrollHints();

      window.XYDZTZ.ui?.initCodeBlocks();
    } catch (err) {
      console.error('[XYDZTZ] Markdown 渲染失败:', err);
      main.innerHTML = `
        <div style="padding:40px 20px;text-align:center;color:var(--text-secondary)">
          <p>内容渲染出错，请尝试刷新页面</p>
          <p style="font-size:12px;margin-top:8px;color:var(--color-danger)">${err.message}</p>
        </div>
      `;
    }
  },

  initUpdateSummary(main) {
    const heading = Array.from(main.querySelectorAll('h2, h3'))
      .find((item) => /新增内容速览$/.test(item.textContent.trim()));
    if (!heading) return;

    let node = heading.nextElementSibling;
    while (node && !node.classList?.contains('table-outer')) {
      if (/^H[1-6]$/i.test(node.tagName)) return;
      node = node.nextElementSibling;
    }
    if (!node) return;

    const entries = Array.from(node.querySelectorAll('tbody tr')).map((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim());
      return {
        title: cells[0],
        summary: cells[1],
        tags: cells[2],
      };
    }).filter((entry) => entry.title && entry.summary);

    if (entries.length === 0) return;

    const summary = document.createElement('section');
    summary.className = 'update-summary';
    summary.innerHTML = entries.map((entry) => `
      <article class="update-summary-item">
        <div class="update-summary-head">
          <h4>${this.escapeHtml(entry.title)}</h4>
          <span class="update-kind update-kind-new">新增</span>
        </div>
        <p>${this.escapeHtml(entry.summary)}</p>
        <div class="keyword-tags">${this.renderKeywordTags(entry.tags)}</div>
      </article>
    `).join('');

    node.replaceWith(summary);
  },

  initJieyunLookup(main) {
    const headings = Array.from(main.querySelectorAll('h1'));
    const appendix = headings.find((heading) => heading.textContent.trim() === '附录：劫运解密查询');
    if (!appendix) return;

    let node = appendix.nextElementSibling;
    let tableOuter = null;
    while (node) {
      if (node.matches?.('h1')) break;
      if (node.classList?.contains('table-outer')) {
        tableOuter = node;
        break;
      }
      node = node.nextElementSibling;
    }
    if (!tableOuter) return;

    const rows = Array.from(tableOuter.querySelectorAll('tbody tr'));
    const entries = rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim());
      return {
        id: cells[0],
        name: cells[1],
        verse: cells[2],
        answer: cells[3],
      };
    }).filter((entry) => entry.id && entry.name && entry.answer);

    if (entries.length === 0) return;

    const lookup = document.createElement('section');
    lookup.className = 'jieyun-lookup';
    lookup.innerHTML = `
      <div class="jieyun-lookup-controls">
        <label class="jieyun-lookup-label" for="jieyun-query">劫运箴言查询</label>
        <div class="jieyun-lookup-row">
          <input id="jieyun-query" class="jieyun-lookup-input" type="search" inputmode="search" autocomplete="off" placeholder="劫运事件或箴言" />
          <button class="jieyun-lookup-button" type="button">查询</button>
        </div>
      </div>
      <div class="jieyun-lookup-result" aria-live="polite">
        <p class="jieyun-lookup-empty">输入更具体的箴言线索后，查询劫运答案。</p>
      </div>
      <div class="jieyun-lookup-index" aria-hidden="true"></div>
    `;

    const input = lookup.querySelector('.jieyun-lookup-input');
    const button = lookup.querySelector('.jieyun-lookup-button');
    const result = lookup.querySelector('.jieyun-lookup-result');
    const index = lookup.querySelector('.jieyun-lookup-index');
    index.textContent = entries.map((entry) => `${entry.id} ${entry.name} ${entry.verse} ${entry.answer}`).join(' ');

    const normalize = (value) => value.trim().toLowerCase();
    const renderEntry = (entry) => {
      result.innerHTML = `
        <article class="jieyun-card">
          <div class="jieyun-card-kicker">第 ${this.escapeHtml(entry.id)} 重劫运</div>
          <h2>${this.escapeHtml(entry.name)}</h2>
          <blockquote>${this.escapeHtml(entry.verse)}</blockquote>
          <p><strong>谜题答案：</strong>${this.escapeHtml(entry.answer)}</p>
        </article>
      `;
    };

    const renderMessage = (message) => {
      result.innerHTML = `<p class="jieyun-lookup-empty">${this.escapeHtml(message)}</p>`;
    };

    const search = () => {
      const query = normalize(input.value);
      if (!query) {
        renderMessage('输入更具体的线索后，只会显示单个劫运答案。');
        return;
      }

      let matches = [];
      const asNumber = Number(query);
      if (Number.isInteger(asNumber) && String(asNumber) === query) {
        matches = entries.filter((entry) => Number(entry.id) === asNumber);
      } else {
        matches = entries.filter((entry) => {
          const haystack = normalize(`${entry.id} ${entry.name} ${entry.verse} ${entry.answer}`);
          return haystack.includes(query);
        });
      }

      if (matches.length === 1) {
        renderEntry(matches[0]);
      } else if (matches.length > 1) {
        renderMessage(`找到 ${matches.length} 个可能结果，请输入更具体的编号、名称或关键词。`);
      } else {
        renderMessage('没有找到对应劫运，请换一个编号、名称或关键词。');
      }
    };

    button.addEventListener('click', search);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') search();
    });
    input.addEventListener('input', window.XYDZTZ.utils.debounce(search, 180));

    tableOuter.replaceWith(lookup);
  },

  initFaq(main) {
    const heading = Array.from(main.querySelectorAll('h1'))
      .find((item) => item.textContent.trim() === '高频Q&A');
    if (!heading) return;

    const questions = [];
    let node = heading.nextElementSibling;
    while (node && !node.matches('h1')) {
      const strong = node.matches('p') ? node.querySelector(':scope > strong:first-child') : null;
      if (strong && /^Q\d+[：:]/i.test(strong.textContent.trim())) questions.push(node);
      node = node.nextElementSibling;
    }
    if (questions.length === 0) return;

    const list = document.createElement('section');
    list.className = 'faq-list';
    list.setAttribute('aria-label', '高频问题列表');
    questions[0].before(list);

    questions.forEach((questionNode) => {
      const questionStrong = questionNode.querySelector(':scope > strong:first-child');
      const questionText = questionStrong?.textContent.trim() || '';
      const match = questionText.match(/^Q(\d+)[：:]\s*(.+)$/i);
      if (!match) return;

      const details = document.createElement('details');
      details.className = 'faq-item';
      details.innerHTML = `
        <summary>
          <span class="faq-index">Q${this.escapeHtml(match[1])}</span>
          <span class="faq-question">${this.escapeHtml(match[2])}</span>
          <span class="faq-chevron" aria-hidden="true"></span>
        </summary>
        <div class="faq-answer"></div>
      `;

      const answer = details.querySelector('.faq-answer');
      const inlineAnswer = questionNode.cloneNode(true);
      inlineAnswer.querySelector(':scope > strong:first-child')?.remove();
      if (inlineAnswer.textContent.trim()) answer.appendChild(inlineAnswer);

      let answerNode = questionNode.nextElementSibling;
      while (answerNode && !answerNode.matches('h1, hr')) {
        const nextQuestion = answerNode.matches('p')
          && /^Q\d+[：:]/i.test(answerNode.querySelector(':scope > strong:first-child')?.textContent.trim() || '');
        if (nextQuestion) break;

        const next = answerNode.nextElementSibling;
        answer.appendChild(answerNode);
        answerNode = next;
      }

      questionNode.remove();
      list.appendChild(details);
    });
  },

  decorateContent(main) {
    const rarityMap = {
      '普通': 'common',
      '精良': 'fine',
      '稀有': 'rare',
      '史诗': 'epic',
      '传说': 'legendary',
    };
    const matchRarity = (text) => rarityMap[text.trim().replace(/层$/, '')] || null;

    main.querySelectorAll('tbody td:first-child').forEach((td) => {
      const cls = matchRarity(td.textContent);
      if (cls) td.classList.add(`rarity-${cls}`);
    });

    main.querySelectorAll('strong').forEach((strong) => {
      const text = strong.textContent.trim();
      if (/层$/.test(text)) {
        const cls = matchRarity(text);
        if (cls) strong.classList.add(`rarity-${cls}`);
      }
    });

    main.querySelectorAll('li, p').forEach((el) => {
      if (!/配方/.test(el.textContent)) return;
      el.querySelectorAll('code').forEach((code) => code.classList.add('mat-chip'));
    });

    main.querySelectorAll('table').forEach((table) => {
      const headers = Array.from(table.querySelectorAll('thead th'));
      const versionIndex = headers.findIndex((th) => th.textContent.trim() === '版本');
      const keywordIndex = headers.findIndex((th) => /^(关键词|标签)$/.test(th.textContent.trim()));

      table.querySelectorAll('tbody tr').forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (versionIndex >= 0 && cells[versionIndex]) cells[versionIndex].classList.add('version-cell');
        if (keywordIndex >= 0 && cells[keywordIndex]) {
          const cell = cells[keywordIndex];
          cell.classList.add('keyword-cell');
          cell.innerHTML = `<div class="keyword-tags">${this.renderKeywordTags(cell.textContent)}</div>`;
        }
      });
    });
  },

  renderKeywordTags(text = '') {
    return text
      .split(/[、,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => `<span class="keyword-tag">${this.escapeHtml(tag)}</span>`)
      .join('');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  initTableScrollHints() {
    const outers = document.querySelectorAll('.table-outer');
    outers.forEach((outer) => {
      const update = () => {
        const { scrollLeft, scrollWidth, clientWidth } = outer;
        outer.classList.toggle('scroll-left', scrollLeft > 4);
        outer.classList.toggle('scroll-right', scrollLeft + clientWidth < scrollWidth - 4);
      };
      outer.addEventListener('scroll', update, { passive: true });
      update();
    });
  }
};
