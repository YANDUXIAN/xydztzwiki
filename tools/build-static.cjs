const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const markedLib = require('../libs/marked.min.js');
const { books } = require('./site-config.cjs');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const termManifestPath = path.join(root, 'data', 'wiki', 'xydztz', 'terms.json');
const materialManifestPath = path.join(root, 'data', 'wiki', 'shared', 'materials.json');
const recipeItemManifestPath = path.join(root, 'data', 'wiki', 'xydztz', 'recipe-items.json');
const configPath = path.join(root, 'tools', 'site-config.cjs');
const sourceIndex = fs.readFileSync(indexPath, 'utf8');
const termManifestSource = fs.readFileSync(termManifestPath, 'utf8');
const materialManifestSource = fs.readFileSync(materialManifestPath, 'utf8');
const recipeItemManifestSource = fs.readFileSync(recipeItemManifestPath, 'utf8');
const configSource = fs.readFileSync(configPath, 'utf8');
const termManifest = JSON.parse(termManifestSource);
const materialManifest = JSON.parse(materialManifestSource);
const recipeItemManifest = JSON.parse(recipeItemManifestSource);
const siteOrigin = 'https://yanduxian.cn';
const sourceFiles = new Map();
const mediaManifestSources = new Map();
const mediaManifests = new Map();

books.forEach((book) => {
  const sourceNames = new Set([book.source, ...book.pages.map((page) => page.sourceFile).filter(Boolean)]);
  sourceNames.forEach((sourceName) => {
    if (sourceFiles.has(sourceName)) return;
    const source = fs.readFileSync(path.join(root, sourceName), 'utf8');
    if (/<[A-Za-z][^>]*>/.test(source)) {
      throw new Error(`${sourceName} 必须保持纯 Markdown，不得包含原始 HTML 标签`);
    }
    sourceFiles.set(sourceName, source);
  });

  // 旧册媒体目录由既有发布流程维护；新增两册清单纳入构建校验与内容哈希。
  if (book.id === 'xydztz') return;
  const manifestSource = fs.readFileSync(path.join(root, book.manifest), 'utf8');
  const manifest = JSON.parse(manifestSource);
  if (manifest.schemaVersion !== 1 || manifest.book !== book.id || !Array.isArray(manifest.objects) || !Array.isArray(manifest.galleries) || !Array.isArray(manifest.demos)) {
    throw new Error(`${book.manifest} 媒体清单结构无效`);
  }
  const mediaIds = new Set();
  const registerImage = (item, context) => {
    if (!item.name || !item.image || item.image.includes('..') || !fs.existsSync(path.join(root, item.image))) {
      throw new Error(`${book.manifest} ${context}图片无效：${item.image || '缺失'}`);
    }
  };
  manifest.objects.forEach((item) => {
    if (!item.id || !item.section || mediaIds.has(item.id)) {
      throw new Error(`${book.manifest} 对象媒体字段不完整`);
    }
    mediaIds.add(item.id);
    registerImage(item, `${book.id}/${item.id}`);
  });
  const pageSlugs = new Set(book.pages.map((page) => page.slug));
  manifest.galleries.forEach((gallery) => {
    if (!gallery.id || mediaIds.has(gallery.id) || !pageSlugs.has(gallery.page) || !gallery.section || !gallery.title || !Array.isArray(gallery.items) || gallery.items.length === 0) {
      throw new Error(`${book.manifest} 图鉴字段不完整：${gallery.id || '缺失 ID'}`);
    }
    mediaIds.add(gallery.id);
    gallery.items.forEach((item, index) => registerImage(item, `${book.id}/${gallery.id}/${index + 1}`));
  });
  mediaManifests.set(book.id, manifest);
  mediaManifestSources.set(book.id, manifestSource);
});

const pageDefinitions = books.flatMap((book) => book.pages.map((page) => ({ ...page, book })));
const content = sourceFiles.get('content.md');

function hashCode(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function legacySlugify(value) {
  return `sec-${value
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60)}-${hashCode(value)}`;
}

function anchorSlugify(value) {
  const slug = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
  return slug || `section-${hashCode(value)}`;
}

if (termManifest.schemaVersion !== 1 || !Array.isArray(termManifest.terms)) {
  throw new Error('词条清单结构无效');
}

const termDefinitions = termManifest.terms;
const termsByName = new Map();
const termUsageCounts = new Map();

termDefinitions.forEach((term) => {
  if (!/^[a-z0-9-]+$/.test(term.id || '')) throw new Error(`词条 ID 无效：${term.id || '缺失'}`);
  if (!term.name || !term.kind || !term.summary || !term.target?.chapter || !term.target?.heading) {
    throw new Error(`词条字段不完整：${term.id}`);
  }
  if (term.image) {
    if (!/^images\/[a-z0-9_/.-]+$/i.test(term.image) || term.image.includes('..')) {
      throw new Error(`词条图标路径无效：${term.name}`);
    }
    if (!fs.existsSync(path.join(root, term.image))) {
      throw new Error(`词条图标文件不存在：${term.name} -> ${term.image}`);
    }
  }
  if (termsByName.has(term.name)) throw new Error(`词条名称重复：${term.name}`);
  termsByName.set(term.name, term);
  termUsageCounts.set(term.id, 0);
});

if (materialManifest.schemaVersion !== 1 || !Array.isArray(materialManifest.materials)) {
  throw new Error('配方材料清单结构无效');
}
if (recipeItemManifest.schemaVersion !== 1 || !Array.isArray(recipeItemManifest.items)) {
  throw new Error('配方成品清单结构无效');
}

const RECIPE_RARITIES = new Set(['common', 'fine', 'rare', 'epic', 'legendary']);
const recipeItemsByName = new Map();
const recipeAliasesByName = new Map();
const ambiguousRecipeAliases = new Set();

function registerRecipeItem(item, source) {
  if (!item.id || !item.name || !item.image) throw new Error(`${source}配方图标字段不完整`);
  if (recipeItemsByName.has(item.name)) throw new Error(`配方图标名称重复：${item.name}`);
  if (!/^[a-z0-9_/-]+$/i.test(item.id)) throw new Error(`配方图标 ID 无效：${item.id}`);
  const image = String(item.image).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!image.startsWith('images/') || image.includes('..')) throw new Error(`配方图标路径无效：${item.name}`);
  if (!fs.existsSync(path.join(root, image))) throw new Error(`配方图标文件不存在：${item.name} -> ${image}`);
  const rarity = item.rarity || 'common';
  if (!RECIPE_RARITIES.has(rarity)) throw new Error(`配方图标稀有度无效：${item.name}`);
  recipeItemsByName.set(item.name, { ...item, image, rarity });
}

materialManifest.materials.forEach((item) => registerRecipeItem(item, '材料'));
recipeItemManifest.items.forEach((item) => registerRecipeItem(item, '成品'));

materialManifest.materials.forEach((item) => {
  const registered = recipeItemsByName.get(item.name);
  (item.aliases || []).forEach((alias) => {
    const existing = recipeItemsByName.get(alias) || recipeAliasesByName.get(alias);
    if (existing && existing.id !== registered.id) {
      recipeAliasesByName.delete(alias);
      ambiguousRecipeAliases.add(alias);
    } else if (!ambiguousRecipeAliases.has(alias)) {
      recipeAliasesByName.set(alias, registered);
    }
  });
});

const RECIPE_ITEM_GROUPS = new Map();

RECIPE_ITEM_GROUPS.forEach((names, groupName) => {
  names.forEach((name) => {
    if (!recipeItemsByName.has(name)) throw new Error(`配方图标组合“${groupName}”引用了未知材料：${name}`);
  });
});

function termHrefPlaceholder(term) {
  return `__TERM_HREF_${term.id.toUpperCase().replace(/-/g, '_')}__`;
}

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveRecipeItem(name) {
  const group = RECIPE_ITEM_GROUPS.get(name);
  if (group) {
    return {
      name,
      items: group.map((itemName) => recipeItemsByName.get(itemName)),
    };
  }
  if (ambiguousRecipeAliases.has(name)) throw new Error(`配方材料别名存在多义：${name}`);
  const item = recipeItemsByName.get(name) || recipeAliasesByName.get(name);
  if (!item) throw new Error(`content.md 使用了未登记配方图标：${name}`);
  return { name: item.name, items: [item] };
}

function parseRecipeToken(raw) {
  const match = /^(.+?)(?:\s*[×xX*]\s*(\d+))?$/.exec(raw.trim());
  if (!match) throw new Error(`配方项目格式无效：${raw}`);
  const quantity = Number(match[2] || 1);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`配方数量无效：${raw}`);
  return { ...resolveRecipeItem(match[1].trim()), quantity };
}

function parseRecipeMacro(kind, source) {
  const parts = source.split(/\s*→\s*/);
  if (kind === '配方' && parts.length !== 2) throw new Error(`配方必须包含一个“→”：${source}`);
  if (kind === '材料' && parts.length !== 1) throw new Error(`材料连排不能包含“→”：${source}`);
  const ingredientSource = parts[0].trim();
  if (!ingredientSource) throw new Error(`配方材料为空：${source}`);
  const ingredients = ingredientSource.split(/\s*\+\s*/).map(parseRecipeToken);
  const result = kind === '配方' ? parseRecipeToken(parts[1]) : null;
  return { ingredients, result };
}

function buildRecipeToken(token, isResult = false) {
  const rarity = token.items[0].rarity;
  const images = token.items.map((item, index) => (
    `<img src="/${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async" width="52" height="52"${token.items.length > 1 ? ` class="recipe-variant recipe-variant-${index + 1}"` : ''} />`
  )).join('');
  const variantClass = token.items.length > 1 ? ' has-variants' : '';
  return `<span class="recipe-token rarity-${rarity}${isResult ? ' is-result' : ''}">
    <span class="recipe-icon-frame${variantClass}">${images}<span class="recipe-quantity">×${token.quantity}</span></span>
    <span class="recipe-item-name">${escapeHtml(token.name)}</span>
  </span>`;
}

function buildRecipeStrip(kind, source) {
  const { ingredients, result } = parseRecipeMacro(kind, source);
  const parts = ingredients.map((ingredient, index) => `<span class="recipe-part">${index > 0 ? '<span class="recipe-operator" aria-hidden="true">＋</span>' : ''}${buildRecipeToken(ingredient)}</span>`);
  if (result) {
    parts.push(`<span class="recipe-part recipe-part-result"><span class="recipe-operator recipe-arrow" aria-hidden="true">→</span>${buildRecipeToken(result, true)}</span>`);
  }
  const ingredientLabel = ingredients.map((item) => `${item.name}${item.quantity}`).join('加');
  const ariaLabel = result ? `${ingredientLabel}，制成${result.name}${result.quantity}` : ingredientLabel;
  return `<span class="recipe-strip recipe-strip-${kind === '配方' ? 'complete' : 'materials'}" role="group" aria-label="${escapeHtml(ariaLabel)}">${parts.join('')}</span>`;
}

function inferBlockquoteType(value) {
  const text = value.toLowerCase();
  if (text.includes('警告') || text.includes('危险') || text.includes('失败') || text.includes('错误')) return 'warning';
  if (text.includes('严禁') || text.includes('禁止')) return 'danger';
  if (text.includes('说明') || text.includes('备注') || text.includes('提示') || text.includes('提醒') || text.includes('注意') || text.includes('要点') || text.includes('当前规则')) return 'info';
  if (text.includes('成功') || text.includes('完成') || text.includes('兼容')) return 'success';
  return '';
}

function splitHeadingBlocks(markdown, depth) {
  const marker = '#'.repeat(depth);
  const matches = Array.from(markdown.matchAll(new RegExp(`^${marker}\\s+(.+)$`, 'gm')));
  return matches.map((match, index) => ({
    title: match[1].trim(),
    markdown: markdown.slice(match.index, matches[index + 1]?.index ?? markdown.length).trim(),
  }));
}

function shiftHeadingDepth(markdown, offset, dropFirstHeading, omitHeadings = []) {
  const lines = markdown.split(/\r?\n/);
  if (dropFirstHeading) lines.shift();
  return lines.map((line) => {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading && omitHeadings.includes(heading[2].trim())) return '';
    return line.replace(/^(#{1,6})\s+/, (match, hashes) => {
    const depth = Math.min(6, hashes.length + offset);
    return `${'#'.repeat(depth)} `;
    });
  }).join('\n').trim();
}

// 一级章节原稿用 --- 标记边界；分篇构建会自行补一条分隔线，
// 因此先移除每个切片尾部的原稿分隔，避免合并后生成连续双线或页尾孤线。
function stripTrailingSectionBreak(markdown) {
  return markdown.replace(/(?:\r?\n[ \t]*---[ \t]*)+$/g, '').trim();
}

const blocksBySourceAndDepth = new Map();
function sourceBlocks(sourceName, depth) {
  const key = `${sourceName}:${depth}`;
  if (!blocksBySourceAndDepth.has(key)) {
    blocksBySourceAndDepth.set(key, splitHeadingBlocks(sourceFiles.get(sourceName), depth));
  }
  return blocksBySourceAndDepth.get(key);
}

pageDefinitions.forEach((page) => {
  const sourceName = page.sourceFile || page.book.source;
  if (page.source.mode === 'h2') {
    const matches = sourceBlocks(sourceName, 2).filter((block) => block.title === page.source.title);
    if (matches.length !== 1) {
      throw new Error(`${sourceName} 顶级篇章“${page.source.title}”应唯一存在（找到 ${matches.length} 个）`);
    }
    page.markdown = matches[0].markdown;
    return;
  }

  const blocks = sourceBlocks(sourceName, 1);
  const selected = page.source.sections.map((title) => {
    const matches = blocks.filter((block) => block.title === title);
    if (matches.length !== 1) {
      throw new Error(`${sourceName} 一级章节“${title}”应唯一存在（找到 ${matches.length} 个）`);
    }
    const dropHeading = page.source.drop.includes(title);
    return stripTrailingSectionBreak(
      shiftHeadingDepth(matches[0].markdown, dropHeading ? 1 : 2, dropHeading, page.source.omitHeadings || [])
    );
  }).filter(Boolean);

  page.markdown = `## ${page.title}\n\n${selected.join('\n\n---\n\n')}`;
});

/* 内嵌组件宏：content.md 保持纯文本，用一行中文标记引用组件，构建期展开 */
const PRIZE_POOL_MARKER = '{{组件：聚宝盆奖池}}';
if (content.split(PRIZE_POOL_MARKER).length - 1 !== 1) {
  throw new Error(`content.md 中 ${PRIZE_POOL_MARKER} 标记应恰好出现一次`);
}

const PRIZE_POOL_TIERS = [
  {
    key: 'common', name: '普通层', rate: '60%', protection: '无保护', wide: false,
    items: '金块、沙之石、猪皮、牛毛、硝石、铜钱、莲花、莲叶、竹子、莲藕、莲子、兔绒、啜食者皮、齿轮、骨片、活木、竹笋、月岩、月蛾翅膀。',
    unlocks: [],
  },
  {
    key: 'fine', name: '精良层', rate: '25%', protection: '无保护', wide: false,
    items: '牛角、蜜脾、麋鹿鹅羽毛、伏特羊角、蓝宝石、红宝石、岩浆虫卵、高脚鸟蛋、月亮碎片、月树花、鼹鼠、龙虾、尖刺灌木、食人花球、猴尾草植株、香蕉丛、月树苗、种壳、化石碎片，以及各类巨型作物。',
    unlocks: [],
  },
  {
    key: 'rare', name: '稀有层', rate: '11%', protection: '20 抽后保护', wide: true,
    items: '葫芦、竹子、海象牙、步行手杖、黄油、紫宝石、橙宝石、黄宝石、绿宝石、五仁月饼、莲蓉月饼、冰皮月饼、瓶中信、战桨、钢丝棉枕头、石果种子、格罗姆黏液、树果酱、邪天翁羽毛、绝望石、恐惧燃料、废料、酒葫芦、子圭石、钢丝棉、鼻涕黏液、腾云丹、蜗牛护甲、暗夜剑、暗夜甲、荆棘丹、一角鲸的角、龙鳞。',
    unlocks: [['天体风暴', '注能月亮碎片'], ['裂隙开启', '纯粹辉煌、亮茄外壳']],
  },
  {
    key: 'epic', name: '史诗层', rate: '3.5%', protection: '50 抽后保护', wide: true,
    items: '宫灯、曼德拉草、铥矿棒、铥矿皇冠、铥矿甲、还魂丹、铜钱串、暗影心房、小金蟾、坎普斯背包、古董船套装、出逃腿靴、火猿石心、龙皮绸缎、月饼盒、超级红包(年BUFF)、子圭青金、避寒心、避暑心、避尘心、园艺学简编、丹药葫芦、疙瘩树种、蜂王冠、邪天翁喙。',
    unlocks: [['天体风暴', '惊喜种子、龙蝇船套装'], ['裂隙开启', '火花柜、附身暗影心房、暗影碎步']],
  },
  {
    key: 'legendary', name: '传说层', rate: '0.5%', protection: '100 抽后保护', wide: true,
    items: '彩虹宝石、巨鹿眼球、蘑菇皮、熊皮、远古守护者角、桃木手杖、大蟠桃、子圭战盔、子圭战甲。',
    unlocks: [['天体风暴', '启迪碎片、紫金葫芦、羊脂玉净瓶、如意、避尘丹、避寒丹、避暑丹'], ['裂隙开启', '天体珠宝']],
  },
];

function buildPrizePoolOverview() {
  const tiers = PRIZE_POOL_TIERS.map((tier) => {
    const unlocks = tier.unlocks.length > 0
      ? `\n      <div class="prize-tier-unlocks">\n${tier.unlocks.map(([stage, reward]) => `        <p><span>${stage}</span>${reward}</p>`).join('\n')}\n      </div>`
      : '';
    return `    <article class="prize-tier prize-tier-${tier.key}${tier.wide ? ' prize-tier-wide' : ''}">
      <header class="prize-tier-heading">
        <h6>${tier.name}</h6>
        <div class="prize-tier-meta"><span class="prize-tier-rate">${tier.rate}</span><span>${tier.protection}</span></div>
      </header>
      <p class="prize-tier-items">${tier.items}</p>${unlocks}
    </article>`;
  }).join('\n');
  return `<section class="prize-pool-overview" aria-labelledby="prize-pool-title">
  <header class="prize-pool-heading">
    <h5 id="prize-pool-title">当前奖池概览</h5>
  </header>
  <div class="prize-pool-grid">
${tiers}
  </div>
</section>`;
}

function enhanceWheelCompat(html) {
  const pattern = /(<h3\b[^>]*>轮盘技能兼容<\/h3>)\s*<p>([\s\S]*?)<\/p>\s*<p><strong>官方人物技能<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>\s*<p><strong>模组人物与拓展内容<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>/;
  return html.replace(pattern, `$1<section class="wheel-compat" aria-label="轮盘技能兼容范围">
  <p class="wheel-compat-lead">$2</p>
  <div class="wheel-compat-grid">
    <article class="wheel-compat-card wheel-compat-official">
      <h5>官方人物技能</h5>
      <p>$3</p>
    </article>
    <article class="wheel-compat-card wheel-compat-mods">
      <h5>模组人物与拓展内容</h5>
      <p>$4</p>
    </article>
  </div>
</section>`);
}

const legacySlugCounts = new Map();
let routeSlugCounts = new Map();
const headingRecords = [];
let currentChapter = null;
let headingOrder = 0;

/* H3 章序：每篇从壹重新计数，以 data-num 注入（不进文本，TOC/搜索/组件匹配不受影响） */
const CHAPTER_NUMERALS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾', '拾壹', '拾贰', '拾叁', '拾肆', '拾伍'];
let chapterH3Count = 0;

const renderer = new markedLib.Renderer();
renderer.heading = (text, depth) => {
  const title = stripTags(text);
  const routeBase = anchorSlugify(title);
  const routeCount = (routeSlugCounts.get(routeBase) || 0) + 1;
  routeSlugCounts.set(routeBase, routeCount);
  const id = routeCount === 1 ? routeBase : `${routeBase}-${routeCount}`;

  const legacyBase = legacySlugify(title);
  const legacyCount = (legacySlugCounts.get(legacyBase) || 0) + 1;
  legacySlugCounts.set(legacyBase, legacyCount);
  const legacyId = legacyCount === 1 ? legacyBase : `${legacyBase}-${legacyCount}`;

  headingRecords.push({
    chapter: currentChapter,
    depth,
    id,
    legacyId,
    title,
    order: headingOrder,
  });
  headingOrder += 1;

  if (depth === 2) chapterH3Count = 0;
  const eyebrow = depth === 2 ? ` data-eyebrow="${escapeHtml(currentChapter.eyebrow)}"` : '';
  let num = '';
  if (depth === 3) {
    num = ` data-num="${CHAPTER_NUMERALS[chapterH3Count] || chapterH3Count + 1}"`;
    chapterH3Count += 1;
  }
  return `<h${depth} id="${escapeHtml(id)}" data-legacy-id="${escapeHtml(legacyId)}"${eyebrow}${num}>${text}</h${depth}>`;
};

renderer.table = (header, body) => {
  const head = header ? `<thead>${header}</thead>` : '';
  const rows = body ? `<tbody>${body}</tbody>` : '';
  return `<div class="table-outer"><div class="table-wrapper"><table>${head}${rows}</table></div></div>`;
};

renderer.blockquote = (quote) => {
  const plainText = stripTags(quote);
  if (plainText.startsWith('检索标签')) {
    return `<blockquote class="bq-search-tags" aria-hidden="true">${quote}</blockquote>`;
  }
  if (plainText.includes('[腌笃鲜联动提示]')) {
    return `<blockquote class="bq-interop">${quote}</blockquote>`;
  }
  const type = inferBlockquoteType(plainText);
  return `<blockquote${type ? ` class="bq-${type}"` : ''}>${quote}</blockquote>`;
};

/* 术语条目：`**术语**：说明` 形式的列表项标记 .term-item，供 CSS 做术语/说明双色分层 */
renderer.listitem = (text) => {
  const isTermItem = /^<strong>[^<>]{1,24}<\/strong>[：:]/.test(text.trim());
  return `<li${isTermItem ? ' class="term-item"' : ''}>${text}</li>`;
};

markedLib.use({
  extensions: [
    {
      name: 'recipeStrip',
      level: 'inline',
      start(src) {
        const recipeIndex = src.indexOf('{{配方：');
        const materialIndex = src.indexOf('{{材料：');
        if (recipeIndex === -1) return materialIndex;
        if (materialIndex === -1) return recipeIndex;
        return Math.min(recipeIndex, materialIndex);
      },
      tokenizer(src) {
        const match = /^\{\{(配方|材料)：([^{}\n]+)\}\}/.exec(src);
        if (!match) return undefined;
        return {
          type: 'recipeStrip',
          raw: match[0],
          kind: match[1],
          source: match[2].trim(),
        };
      },
      renderer(token) {
        return buildRecipeStrip(token.kind, token.source);
      },
    },
    {
      name: 'wikiTerm',
      level: 'inline',
      start(src) {
        return src.indexOf('[[');
      },
      tokenizer(src) {
        const match = /^\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/.exec(src);
        if (!match) return undefined;
        return {
          type: 'wikiTerm',
          raw: match[0],
          termName: match[1].trim(),
          label: (match[2] || match[1]).trim(),
        };
      },
      renderer(token) {
        const term = termsByName.get(token.termName);
        if (!term) throw new Error(`content.md 使用了未登记词条：${token.termName}`);
        if (!token.label) throw new Error(`词条显示文本为空：${term.name}`);
        termUsageCounts.set(term.id, termUsageCounts.get(term.id) + 1);
        const imagePath = term.image
          ? (term.image.startsWith('/') ? term.image : `/${term.image.replace(/^\.\//, '')}`)
          : '';
        const imageAttr = imagePath ? ` data-term-image="${escapeHtml(imagePath)}"` : '';
        return `<a class="term-link" href="${termHrefPlaceholder(term)}" data-term-id="${escapeHtml(term.id)}" data-term-kind="${escapeHtml(term.kind)}" data-term-summary="${escapeHtml(term.summary)}"${imageAttr}>${escapeHtml(token.label)}</a>`;
      },
    },
  ],
});

markedLib.setOptions({ renderer, gfm: true, breaks: false });

pageDefinitions.forEach((chapter) => {
  currentChapter = chapter;
  routeSlugCounts = new Map();
  const markdown = chapter.markdown.split(PRIZE_POOL_MARKER).join(buildPrizePoolOverview());
  chapter.html = markedLib.parse(markdown).trim();
  chapter.html = enhanceWheelCompat(chapter.html);
  // 导语：H2 之后（跳过检索标签块）的首个段落标记为 .lede，无引言段的篇目不受影响
  // 块引用内容用截断贪婪，禁止跨越 </blockquote>，防止误吞后续章节
  chapter.html = chapter.html.replace(
    /^(<h2\b[^>]*>[\s\S]*?<\/h2>(?:<blockquote class="bq-search-tags"[^>]*>(?:(?!<\/blockquote>)[\s\S])*<\/blockquote>)*)<p>/,
    '$1<p class="lede">'
  );
});

mediaManifests.forEach((manifest, bookId) => {
  manifest.objects.forEach((item) => {
    const found = headingRecords.some((record) => record.chapter.book.id === bookId && record.title.includes(item.section));
    if (!found) throw new Error(`${bookId} 对象图片找不到目标标题：${item.name} -> ${item.section}`);
  });
  manifest.galleries.forEach((gallery) => {
    const page = pageDefinitions.find((item) => item.book.id === bookId && item.slug === gallery.page);
    const found = headingRecords.some((record) => record.chapter === page && record.title.includes(gallery.section));
    if (!found) throw new Error(`${bookId} 图鉴找不到目标标题：${gallery.title} -> ${gallery.section}`);
  });
});

termDefinitions.forEach((term) => {
  const targetChapter = pageDefinitions.find((chapter) => chapter.book.id === 'xydztz' && chapter.slug === term.target.chapter);
  if (!targetChapter) throw new Error(`词条目标篇章不存在：${term.name} -> ${term.target.chapter}`);
  const targets = headingRecords.filter((record) => record.chapter === targetChapter && record.title === term.target.heading);
  if (targets.length !== 1) {
    throw new Error(`词条目标标题应唯一存在：${term.name} -> ${term.target.heading}（找到 ${targets.length} 个）`);
  }
  if (termUsageCounts.get(term.id) === 0) throw new Error(`词条尚未在 content.md 显式引用：${term.name}`);
  const href = `${targetChapter.url}#${encodeURIComponent(targets[0].id)}`;
  pageDefinitions.forEach((chapter) => {
    chapter.html = chapter.html.split(termHrefPlaceholder(term)).join(href);
  });
});

function buildSearchIndex(chapter) {
  const records = headingRecords.filter((record) => record.chapter === chapter);
  const parentByDepth = new Map();
  const pattern = /<h([2-6]) id="([^"]+)" data-legacy-id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-6]\b|$)/g;
  const entries = [];
  let match;

  while ((match = pattern.exec(chapter.html)) !== null) {
    const depth = Number(match[1]);
    const id = match[2];
    const legacyId = match[3];
    const heading = stripTags(match[4]);
    const body = stripTags(match[5]);

    for (const key of Array.from(parentByDepth.keys())) {
      if (key >= depth) parentByDepth.delete(key);
    }
    const parent = depth > 2 ? parentByDepth.get(depth - 1) || parentByDepth.get(2) || '' : '';
    parentByDepth.set(depth, heading);

    entries.push({
      book: chapter.book.title,
      bookId: chapter.book.id,
      chapter: chapter.title,
      chapterSlug: chapter.slug,
      heading,
      parent,
      depth,
      id,
      legacyId,
      body,
      url: `${chapter.url}${depth === 2 ? '' : `#${encodeURIComponent(id)}`}`,
      order: records.find((record) => record.id === id)?.order ?? entries.length,
    });
  }

  return entries;
}

const searchIndex = pageDefinitions.flatMap(buildSearchIndex);
const contentHasher = crypto.createHash('sha256');
sourceFiles.forEach((source, sourceName) => contentHasher.update(sourceName).update(source));
contentHasher
  .update(termManifestSource)
  .update(materialManifestSource)
  .update(recipeItemManifestSource)
  .update(configSource);
mediaManifestSources.forEach((source, bookId) => contentHasher.update(bookId).update(source));
const contentHash = contentHasher.digest('hex').slice(0, 12);

function replaceMeta(html, attribute, key, value) {
  const pattern = new RegExp(`<meta ${attribute}="${key}" content="[^"]*" \/>`);
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`);
}

function buildChapterNav(activeChapter) {
  const bookSwitcher = `<details class="book-switcher">
          <summary><strong>${escapeHtml(activeChapter.book.title)}</strong></summary>
          <div class="book-switcher-menu">
${books.map((book) => `            <a class="book-switcher-link${book === activeChapter.book ? ' active' : ''}" href="${book.pages[0].url}">${escapeHtml(book.title)}${book === activeChapter.book ? '<span class="sr-only">（当前）</span>' : ''}</a>`).join('\n')}
          </div>
        </details>
        <span class="chapter-nav-divider" aria-hidden="true"></span>`;
  const chapterLinks = activeChapter.book.pages.map((page) => {
    const chapter = pageDefinitions.find((item) => item.book === activeChapter.book && item.slug === page.slug);
    const current = chapter === activeChapter;
    return `<a class="chapter-nav-link${current ? ' active' : ''}" href="${chapter.url}"${current ? ' aria-current="page"' : ''}>${chapter.title}</a>`;
  }).join('\n        ');
  return `${bookSwitcher}\n        <div class="chapter-nav-pages">\n          ${chapterLinks}\n        </div>`;
}

function buildSidebarToc(chapter) {
  const items = headingRecords
    .filter((record) => record.chapter === chapter && (record.depth === 3 || record.depth === 4));
  const structure = [];
  let currentH3 = null;

  items.forEach((item) => {
    if (item.depth === 3) {
      currentH3 = { ...item, children: [] };
      structure.push(currentH3);
    } else if (currentH3) {
      currentH3.children.push(item);
    } else {
      structure.push({ ...item, children: [] });
    }
  });

  let tocH3Count = 0;
  return structure.map((section, index) => {
    const hasChildren = section.children.length > 0;
    const num = section.depth === 3 ? ` data-num="${CHAPTER_NUMERALS[tocH3Count] || tocH3Count + 1}"` : '';
    if (section.depth === 3) tocH3Count += 1;
    return `<li class="toc-item toc-section${hasChildren ? ' has-children' : ''}${index === 0 ? ' open' : ''}">
            <a class="toc-link" href="#${encodeURIComponent(section.id)}" data-id="${escapeHtml(section.id)}"${num}>${escapeHtml(section.title)}</a>${hasChildren ? `
            <ul class="toc-sublist">
${section.children.map((child) => `              <li class="toc-item"><a class="toc-link h4" href="#${encodeURIComponent(child.id)}" data-id="${escapeHtml(child.id)}">${escapeHtml(child.title)}</a></li>`).join('\n')}
            </ul>` : ''}
          </li>`;
  }).join('\n          ');
}

function normalizeRootAssets(html) {
  return html.replace(/\.\/(?=(?:images|fonts|styles|scripts|libs|media)\/)/g, '/');
}

function buildPage(chapter) {
  const pageTitle = `${chapter.title} | ${chapter.book.title} | 《腌笃鲜》`;
  const canonical = `${siteOrigin}${chapter.url}`;
  const snapshot = `<!-- STATIC_CONTENT_START -->\n${chapter.html}\n            <!-- STATIC_CONTENT_END -->`;
  const nav = `<!-- CHAPTER_NAV_START -->\n        ${buildChapterNav(chapter)}\n        <!-- CHAPTER_NAV_END -->`;
  const toc = `<!-- SIDEBAR_TOC_START -->\n          ${buildSidebarToc(chapter)}\n          <!-- SIDEBAR_TOC_END -->`;

  let html = sourceIndex.replace(
    /<!-- STATIC_CONTENT_START -->[\s\S]*?<!-- STATIC_CONTENT_END -->/,
    snapshot
  );
  html = html.replace(
    /<!-- CHAPTER_NAV_START -->[\s\S]*?<!-- CHAPTER_NAV_END -->/,
    nav
  );
  html = html.replace(
    /<!-- SIDEBAR_TOC_START -->[\s\S]*?<!-- SIDEBAR_TOC_END -->/,
    toc
  );
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${pageTitle}</title>`);
  html = html.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`);
  html = replaceMeta(html, 'name', 'description', chapter.description);
  html = replaceMeta(html, 'property', 'og:title', pageTitle);
  html = replaceMeta(html, 'property', 'og:description', chapter.description);
  html = replaceMeta(html, 'property', 'og:site_name', '《腌笃鲜》');
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'name', 'author', '《腌笃鲜》资料整理');
  html = replaceMeta(html, 'name', 'twitter:title', pageTitle);
  html = replaceMeta(html, 'name', 'twitter:description', chapter.description);
  html = html.replace(
    /<body(?:\s[^>]*)?>/,
    `<body data-book-id="${chapter.book.id}" data-book-title="${escapeHtml(chapter.book.title)}" data-chapter-slug="${chapter.slug}" data-chapter-title="${escapeHtml(chapter.title)}" data-search-index="/search-index.json?v=${contentHash}">`
  );
  html = html.replace(
    /<nav class="chapter-nav" aria-label="[^"]*">/,
    `<nav class="chapter-nav" aria-label="${escapeHtml(chapter.book.title)}篇章导航">`
  );
  html = html.replace(
    /<input type="text" id="toc-search" placeholder="[^"]*" aria-label="[^"]*" \/>/,
    `<input type="text" id="toc-search" placeholder="搜索三本资料…" aria-label="搜索全部资料" />`
  );
  html = html.replace(
    /<h3 id="sidebar-title">[\s\S]*?<\/h3>/,
    `<h3 id="sidebar-title">${chapter.title}目录</h3>`
  );
  html = html.replace(
    /(<div class="md-body" id="main-content")[^>]*>/,
    `$1 data-static-snapshot="ready" data-content-hash="${contentHash}" data-chapter="${chapter.slug}">`
  );
  html = normalizeRootAssets(html);
  return html;
}

if (!sourceIndex.includes('<!-- STATIC_CONTENT_START -->') || !sourceIndex.includes('<!-- STATIC_CONTENT_END -->')) {
  throw new Error('index.html 缺少静态快照标记');
}
if (!sourceIndex.includes('<!-- CHAPTER_NAV_START -->') || !sourceIndex.includes('<!-- CHAPTER_NAV_END -->')) {
  throw new Error('index.html 缺少篇级导航标记');
}
if (!sourceIndex.includes('<!-- SIDEBAR_TOC_START -->') || !sourceIndex.includes('<!-- SIDEBAR_TOC_END -->')) {
  throw new Error('index.html 缺少侧栏目录标记');
}

pageDefinitions.forEach((chapter) => {
  const outputPath = path.join(root, chapter.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildPage(chapter), 'utf8');
});

const legacyCreatureRedirectPath = path.join(root, 'myth-characters/creatures/index.html');
fs.mkdirSync(path.dirname(legacyCreatureRedirectPath), { recursive: true });
fs.writeFileSync(legacyCreatureRedirectPath, `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=/myth-theme/creatures/">
  <link rel="canonical" href="${siteOrigin}/myth-theme/creatures/">
  <title>首领与怪物 · 神话主题</title>
</head>
<body>
  <p>内容已迁移至<a href="/myth-theme/creatures/">神话主题·首领与怪物</a>。</p>
  <script>location.replace('/myth-theme/creatures/' + location.search + location.hash);</script>
</body>
</html>
`, 'utf8');

fs.writeFileSync(path.join(root, 'search-index.json'), `${JSON.stringify({ version: contentHash, entries: searchIndex })}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`, 'utf8');
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pageDefinitions.map((chapter) => `  <url>
    <loc>${siteOrigin}${chapter.url}</loc>
    <changefreq>weekly</changefreq>
    <priority>${chapter.url === '/' ? '1.0' : chapter.slug === chapter.book.pages[0].slug ? '0.9' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>
`, 'utf8');

console.log(`Built ${books.length} books, ${pageDefinitions.length} static pages and ${searchIndex.length} search entries (${contentHash}).`);
