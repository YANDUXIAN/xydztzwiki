// ============================================
// 《腌笃鲜》维基百科 - Static Content Enhancements
// ============================================

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.renderer = {
  enhance(main) {
    if (!main || main.dataset.enhanced === 'true') return;
    this.initUpdateSummary(main);
    this.initJieyunLookup(main);
    this.initWheelCompat(main);
    this.initFaq(main);
    this.decorateContent(main);
    this.initTermTooltips(main);
    this.initTableScrollHints();
    window.XYDZTZ.ui?.initCodeBlocks();
    main.dataset.enhanced = 'true';
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
    const headings = Array.from(main.querySelectorAll('h1, h2, h3, h4'));
    const lookupHeading = headings.find((heading) => heading.textContent.trim() === '劫运解密查询');
    if (!lookupHeading) return;

    const headingLevel = Number(lookupHeading.tagName.slice(1));
    let node = lookupHeading.nextElementSibling;
    let tableOuter = null;
    while (node) {
      if (/^H[1-6]$/.test(node.tagName) && Number(node.tagName.slice(1)) <= headingLevel) break;
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
          <h5>${this.escapeHtml(entry.name)}</h5>
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
    const heading = Array.from(main.querySelectorAll('h1, h2, h3, h4'))
      .find((item) => item.textContent.trim() === '常见问题与排错');
    if (!heading) return;

    const headingLevel = Number(heading.tagName.slice(1));
    const questions = [];
    let node = heading.nextElementSibling;
    while (node) {
      if (/^H[1-6]$/.test(node.tagName) && Number(node.tagName.slice(1)) <= headingLevel) break;
      const strong = node.matches('p') ? node.querySelector(':scope > strong:first-child') : null;
      if (strong && /^Q\d+[：:]/i.test(strong.textContent.trim())) questions.push(node);
      node = node.nextElementSibling;
    }
    if (questions.length === 0) return;

    const list = document.createElement('section');
    list.className = 'faq-list';
    list.setAttribute('aria-label', '高频问题列表');
    questions[0].before(list);

    // 展开全部 / 收起全部（内嵌于标题行右侧，不独占一行）
    heading.classList.add('faq-heading');
    const toggleAll = document.createElement('button');
    toggleAll.type = 'button';
    toggleAll.className = 'faq-toggle-all';
    toggleAll.textContent = '展开全部';
    toggleAll.addEventListener('click', (event) => {
      event.stopPropagation();
      const items = Array.from(list.querySelectorAll('details.faq-item'));
      const shouldOpen = items.some((item) => !item.open);
      items.forEach((item) => { item.open = shouldOpen; });
      toggleAll.textContent = shouldOpen ? '收起全部' : '展开全部';
    });
    heading.appendChild(toggleAll);

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
      while (answerNode && !answerNode.matches('hr')) {
        if (/^H[1-6]$/.test(answerNode.tagName) && Number(answerNode.tagName.slice(1)) <= headingLevel) break;
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

  initWheelCompat(main) {
    const heading = Array.from(main.querySelectorAll('h3'))
      .find((item) => item.textContent.trim() === '轮盘技能兼容');
    if (!heading || heading.nextElementSibling?.classList.contains('wheel-compat')) return;

    const nodes = [];
    let node = heading.nextElementSibling;
    while (node && !node.matches('h1, h2, h3, hr')) {
      nodes.push(node);
      node = node.nextElementSibling;
    }

    const findLabel = (text) => nodes.find((item) => {
      if (!item.matches('p') || item.children.length !== 1) return false;
      const strong = item.querySelector(':scope > strong:only-child');
      return strong?.textContent.trim() === text;
    });

    const officialLabel = findLabel('官方人物技能');
    const modsLabel = findLabel('模组人物与拓展内容');
    const lead = nodes.find((item) => item.matches('p') && item !== officialLabel && item !== modsLabel);
    const officialBody = officialLabel?.nextElementSibling;
    const modsBody = modsLabel?.nextElementSibling;
    if (!lead || !officialBody?.matches('p') || !modsBody?.matches('p')) return;

    const section = document.createElement('section');
    section.className = 'wheel-compat';
    section.setAttribute('aria-label', '轮盘技能兼容范围');

    lead.classList.add('wheel-compat-lead');
    section.appendChild(lead);

    const grid = document.createElement('div');
    grid.className = 'wheel-compat-grid';
    section.appendChild(grid);

    const appendCard = (className, title, body) => {
      const card = document.createElement('article');
      card.className = `wheel-compat-card ${className}`;
      const cardTitle = document.createElement('h5');
      cardTitle.textContent = title;
      card.append(cardTitle, body);
      grid.appendChild(card);
    };

    appendCard('wheel-compat-official', '官方人物技能', officialBody);
    appendCard('wheel-compat-mods', '模组人物与拓展内容', modsBody);
    officialLabel.remove();
    modsLabel.remove();
    heading.after(section);
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
    // 色彩语义只给少数类型词：战斗/BOSS 系用朱红，人物/精怪系用黛青，其余保持中性灰
    const toneMap = new Map([
      ['BOSS', 'fire'], ['BOSS奖励', 'fire'], ['怪物', 'fire'], ['阶段战', 'fire'],
      ['首领', 'fire'], ['防火', 'fire'], ['束焰', 'fire'],
      ['人物', 'info'], ['人物开关', 'info'], ['精怪', 'info'], ['守卫', 'info'],
    ]);
    return text
      .split(/[、,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => {
        const tone = toneMap.get(tag);
        const cls = tone ? ` keyword-tag-${tone}` : '';
        return `<span class="keyword-tag${cls}">${this.escapeHtml(tag)}</span>`;
      })
      .join('');
  },

  initTermTooltips(main) {
    const links = Array.from(main.querySelectorAll('a.term-link[data-term-summary]'));
    if (links.length === 0) return;

    const tooltip = document.createElement('aside');
    tooltip.id = 'term-tooltip';
    tooltip.className = 'term-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.hidden = true;

    const icon = document.createElement('img');
    icon.className = 'term-tooltip-icon';
    icon.alt = '';
    icon.loading = 'lazy';
    icon.hidden = true;
    const body = document.createElement('span');
    body.className = 'term-tooltip-body';
    const kind = document.createElement('span');
    kind.className = 'term-tooltip-kind';
    const title = document.createElement('strong');
    title.className = 'term-tooltip-title';
    const summary = document.createElement('span');
    summary.className = 'term-tooltip-summary';
    body.append(kind, title, summary);
    tooltip.append(icon, body);
    document.body.appendChild(tooltip);

    let activeLink = null;

    const position = () => {
      if (!activeLink || tooltip.hidden) return;
      const anchorRect = activeLink.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportGap = 12;
      const anchorGap = 10;
      const centeredLeft = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
      const left = Math.min(
        Math.max(centeredLeft, viewportGap),
        window.innerWidth - tooltipRect.width - viewportGap
      );
      let top = anchorRect.bottom + anchorGap;
      let placement = 'bottom';

      if (top + tooltipRect.height > window.innerHeight - viewportGap) {
        top = anchorRect.top - tooltipRect.height - anchorGap;
        placement = 'top';
      }

      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.max(viewportGap, Math.round(top))}px`;
      tooltip.dataset.placement = placement;
    };

    const show = (link) => {
      if (!link?.dataset.termSummary) return;
      if (activeLink && activeLink !== link) activeLink.removeAttribute('aria-describedby');
      activeLink = link;
      kind.textContent = link.dataset.termKind || '相关词条';
      title.textContent = link.textContent.trim();
      summary.textContent = link.dataset.termSummary;
      const image = link.dataset.termImage || '';
      if (image) {
        icon.src = window.XYDZTZ.utils.siteAsset(image);
        icon.hidden = false;
      } else {
        icon.hidden = true;
        icon.removeAttribute('src');
      }
      tooltip.classList.toggle('has-icon', Boolean(image));
      link.setAttribute('aria-describedby', tooltip.id);
      tooltip.hidden = false;
      tooltip.setAttribute('aria-hidden', 'false');
      position();
      tooltip.classList.add('visible');
    };

    const hide = (link = activeLink) => {
      if (link && link !== activeLink) return;
      activeLink?.removeAttribute('aria-describedby');
      activeLink = null;
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
      tooltip.hidden = true;
    };

    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    links.forEach((link) => {
      link.addEventListener('pointerenter', () => {
        if (supportsHover.matches) show(link);
      });
      link.addEventListener('pointerleave', () => hide(link));
      link.addEventListener('focus', () => show(link));
      link.addEventListener('blur', () => hide(link));
      link.addEventListener('click', () => hide(link));
      link.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          hide(link);
          link.blur();
        }
      });
    });

    window.addEventListener('scroll', () => hide(), { passive: true });
    window.addEventListener('resize', () => hide(), { passive: true });
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
