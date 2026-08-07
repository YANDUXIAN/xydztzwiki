const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { books } = require('./site-config.cjs');

const root = path.resolve(__dirname, '..');
const termManifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'wiki', 'xydztz', 'terms.json'), 'utf8'));
const termIds = new Set(termManifest.terms.map((term) => term.id));
const pages = books.flatMap((book) => book.pages.map((page) => ({ ...page, book })));
const sourceFiles = new Map();
books.forEach((book) => {
  [book.source, ...book.pages.map((page) => page.sourceFile).filter(Boolean)].forEach((sourceName) => {
    if (!sourceFiles.has(sourceName)) sourceFiles.set(sourceName, fs.readFileSync(path.join(root, sourceName), 'utf8'));
  });
});
const contentHasher = crypto.createHash('sha256');
sourceFiles.forEach((source, sourceName) => contentHasher.update(sourceName).update(source));
contentHasher
  .update(fs.readFileSync(path.join(root, 'data', 'wiki', 'xydztz', 'terms.json'), 'utf8'))
  .update(fs.readFileSync(path.join(root, 'data', 'wiki', 'shared', 'materials.json'), 'utf8'))
  .update(fs.readFileSync(path.join(root, 'data', 'wiki', 'xydztz', 'recipe-items.json'), 'utf8'))
  .update(fs.readFileSync(path.join(root, 'tools', 'site-config.cjs'), 'utf8'));
books.filter((book) => book.id !== 'xydztz')
  .forEach((book) => contentHasher.update(book.id).update(fs.readFileSync(path.join(root, book.manifest), 'utf8')));
const expectedContentHash = contentHasher.digest('hex').slice(0, 12);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pagePathFromUrl(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  if (decoded === '/') return path.join(root, 'index.html');
  if (decoded.endsWith('/')) return path.join(root, decoded.slice(1), 'index.html');
  return path.join(root, decoded.slice(1));
}

const pageHtml = new Map();
pages.forEach((page) => {
  const { title, output: file, eyebrow, book } = page;
  const fullPath = path.join(root, file);
  assert(fs.existsSync(fullPath), `缺少生成页面：${file}`);
  const html = fs.readFileSync(fullPath, 'utf8');
  pageHtml.set(file, html);

  const h2Titles = Array.from(html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g))
    .map((match) => match[1].replace(/<[^>]+>/g, '').trim());
  assert(h2Titles.length === 1 && h2Titles[0] === title, `${file} 顶级篇章不唯一或标题错误`);
  assert(html.includes(`data-eyebrow="${eyebrow}"`), `${file} 缺少正确的篇序眉题`);
  assert((html.match(/aria-current="page"/g) || []).length === 1, `${file} 篇级导航当前态异常`);
  assert((html.match(/class="chapter-nav-link/g) || []).length === book.pages.length, `${file} 篇级导航数量异常`);
  assert((html.match(/class="book-switcher-link/g) || []).length === books.length, `${file} 资料库切换数量异常`);
  const chapterNav = html.match(/<!-- CHAPTER_NAV_START -->([\s\S]*?)<!-- CHAPTER_NAV_END -->/)?.[1] || '';
  assert(!chapterNav.includes('>资料库<'), `${file} 不应显示“资料库”标签`);
  assert(html.includes(`data-book-id="${book.id}"`), `${file} 缺少当前资料库标识`);
  assert(html.includes(`data-content-hash="${expectedContentHash}"`), `${file} 静态正文未按当前内容重新构建`);
  assert(html.includes(`data-search-index="/search-index.json?v=${expectedContentHash}"`), `${file} 搜索索引版本未按当前内容更新`);
  const staticContent = html.match(/<!-- STATIC_CONTENT_START -->([\s\S]*?)<!-- STATIC_CONTENT_END -->/)?.[1]?.trim() || '';
  assert(!/<hr>\s*<hr>/.test(staticContent), `${file} 存在重复章节分隔线`);
  if (page.source.mode === 'h1') {
    assert(!/^<hr>/.test(staticContent), `${file} 不应以章节分隔线开头`);
    assert(!/<hr>$/.test(staticContent), `${file} 不应以章节分隔线结尾`);
  }
  const tocBlock = html.match(/<!-- SIDEBAR_TOC_START -->([\s\S]*?)<!-- SIDEBAR_TOC_END -->/)?.[1] || '';
  const tocIds = Array.from(tocBlock.matchAll(/data-id="([^"]+)"/g)).map((match) => match[1]);
  const bodyIds = new Set(Array.from(html.matchAll(/\sid="([^"]+)"/g)).map((match) => match[1]));
  assert(tocIds.length > 0, `${file} 当前篇目录为空`);
  tocIds.forEach((id) => assert(bodyIds.has(id), `${file} 目录锚点不存在：${id}`));
  assert(!html.includes('/libs/marked.min.js'), `${file} 不应加载运行时 Markdown 解析器`);
  assert(!/\.(?:\/)(?:images|fonts|styles|scripts|libs|media)\//.test(html), `${file} 仍包含不适用于子路径的资源地址`);
});

const searchPayload = JSON.parse(fs.readFileSync(path.join(root, 'search-index.json'), 'utf8'));
assert(Array.isArray(searchPayload.entries) && searchPayload.entries.length > 0, '全站搜索索引为空');
assert(searchPayload.version === expectedContentHash, '全站搜索索引未按当前内容重新构建');

const idsByPage = new Map();
pages.forEach((page) => {
  const ids = new Set(Array.from(pageHtml.get(page.output).matchAll(/\sid="([^"]+)"/g)).map((match) => match[1]));
  idsByPage.set(page.output, ids);
});

let termLinkCount = 0;
const linkedTermIds = new Set();
pages.forEach(({ output: file }) => {
  const html = pageHtml.get(file);
  assert(!html.includes('[['), `${file} 仍包含未渲染的显式词条语法`);
  for (const match of html.matchAll(/\bdata-term-image="([^"]+)"/g)) {
    assert(match[1].startsWith('/'), `${file} 词条图片必须使用站点根路径：${match[1]}`);
  }
  for (const match of html.matchAll(/<a class="term-link" href="([^"]+)" data-term-id="([^"]+)"/g)) {
    const [, reference, termId] = match;
    assert(termIds.has(termId), `${file} 使用了未登记词条 ID：${termId}`);
    const destination = new URL(reference, 'https://yanduxian.cn');
    const targetPath = pagePathFromUrl(destination.pathname);
    const relative = path.relative(root, targetPath).replace(/\\/g, '/');
    const ids = idsByPage.get(relative);
    assert(ids, `${file} 词条链接未指向生成篇页：${reference}`);
    assert(destination.hash, `${file} 词条链接缺少目标锚点：${reference}`);
    const id = decodeURIComponent(destination.hash.slice(1));
    assert(ids.has(id), `${file} 词条链接锚点不存在：${reference}`);
    linkedTermIds.add(termId);
    termLinkCount += 1;
  }
});
termIds.forEach((termId) => assert(linkedTermIds.has(termId), `词条没有生成任何链接：${termId}`));

const legacyIds = new Set();
searchPayload.entries.forEach((entry) => {
  const destination = new URL(entry.url, 'https://yanduxian.cn');
  const targetPath = pagePathFromUrl(destination.pathname);
  assert(fs.existsSync(targetPath), `搜索结果页面不存在：${entry.url}`);

  const relative = path.relative(root, targetPath).replace(/\\/g, '/');
  const ids = idsByPage.get(relative);
  assert(ids, `搜索结果未指向生成篇页：${entry.url}`);
  if (destination.hash) {
    const id = decodeURIComponent(destination.hash.slice(1));
    assert(ids.has(id), `搜索结果锚点不存在：${entry.url}`);
  }
  assert(!legacyIds.has(entry.legacyId), `旧锚点重复：${entry.legacyId}`);
  legacyIds.add(entry.legacyId);
});

const localReferences = [];
pages.forEach(({ output: file }) => {
  const html = pageHtml.get(file);
  for (const match of html.matchAll(/\b(?:src|href|data-src|data-term-image)="(\/[^"]*)"/g)) {
    localReferences.push([file, match[1]]);
  }
  for (const match of html.matchAll(/\b(?:srcset|data-srcset|imagesrcset)="([^"]*)"/g)) {
    match[1].split(',').forEach((candidate) => {
      const url = candidate.trim().split(/\s+/)[0];
      if (url.startsWith('/')) localReferences.push([file, url]);
    });
  }
});

localReferences.forEach(([file, reference]) => {
  const url = new URL(reference, 'https://yanduxian.cn');
  const target = pagePathFromUrl(url.pathname);
  assert(fs.existsSync(target), `${file} 引用的本地资源不存在：${reference}`);
});

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
pages.forEach(({ output: file, url }) => {
  assert(sitemap.includes(`<loc>https://yanduxian.cn${url}</loc>`), `站点地图缺少：${url}`);
});

const themeBook = books.find((book) => book.id === 'myth-theme');
const characterBook = books.find((book) => book.id === 'myth-characters');
const themeHtml = themeBook.pages
  .map((page) => pageHtml.get(page.output))
  .join('\n');
const creatureHtml = pageHtml.get('myth-theme/creatures/index.html');
['黑风大王', '犀牛三大王', '聚宝金蟾', '子圭玄鸟', '年兽'].forEach((title) => {
  assert(new RegExp(`<h3[^>]*>${title}<\\/h3>`).test(creatureHtml), `首领与怪物缺少条目：${title}`);
});
assert(characterBook.title === '神话人物', '人物册名称不是“神话人物”');
assert(!characterBook.pages.some((page) => page.slug === 'myth-creatures' || page.sourceFile === 'myth-theme.md'), '神话人物仍混入怪物页面');

const legacyCreatureRedirect = fs.readFileSync(path.join(root, 'myth-characters/creatures/index.html'), 'utf8');
assert(legacyCreatureRedirect.includes('/myth-theme/creatures/'), '旧精怪地址没有迁移跳转');

const npcHtml = pageHtml.get('myth-theme/npcs/index.html');
const artifactHtml = pageHtml.get('myth-theme/artifacts/index.html');
assert(npcHtml.includes('月宫物品') && npcHtml.includes('莹月百宝囊'), '嫦娥页面缺少月宫器物流程');
assert(creatureHtml.includes('三心丹药') && creatureHtml.includes('三心武器'), '犀牛页面缺少丹药或武器路线');
assert(creatureHtml.includes('袈裟与锦襕袈裟') && creatureHtml.includes('子圭装备'), 'Boss 页面缺少关联装备');
assert(!['人物专属炼制', '月宫物品', '三心武器'].some((title) => new RegExp(`<h[3-6][^>]*>${title}`).test(artifactHtml)), '炼丹页仍包含已迁出的专属章节');
assert(artifactHtml.indexOf('id="八卦炉解锁与制作"') < artifactHtml.indexOf('id="常规丹药"'), '炼丹页顺序不是先八卦炉后常规丹药');

['myth-theme/index.html', 'myth-characters/index.html'].forEach((file) => {
  const html = pageHtml.get(file);
  assert(html.includes('非官方资料整理'), `${file} 缺少非官方资料声明`);
  assert(html.includes('Workshop ID'), `${file} 缺少 Workshop ID`);
  assert(html.includes('整理版本') && (html.includes('整理日期') || html.includes('整理规则')), `${file} 缺少整理基线`);
  assert((html.includes('原生规则') || html.includes('整理规则')) && html.includes('《腌笃鲜》联动'), `${file} 未区分原生规则与联动变化`);
});
assert((pageHtml.get('myth-characters/index.html').match(/>人物总览<\/h[2-6]>/g) || []).length === 1, '人物总览标题重复展示');

searchPayload.entries.forEach((entry) => assert(entry.book && entry.bookId, `搜索条目缺少资料库归属：${entry.heading}`));

const artReferences = [];
books.filter((book) => book.id !== 'xydztz').forEach((book) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, book.manifest), 'utf8'));
  manifest.objects.forEach((item) => artReferences.push(item.image));
  manifest.galleries.forEach((gallery) => gallery.items.forEach((item) => artReferences.push(item.image)));
});
const themeManifest = JSON.parse(fs.readFileSync(path.join(root, themeBook.manifest), 'utf8'));
const characterManifest = JSON.parse(fs.readFileSync(path.join(root, characterBook.manifest), 'utf8'));
assert(['creature-blackbear', 'creature-siving', 'creature-nian'].every((id) => themeManifest.objects.some((item) => item.id === id)), '精怪主体图片没有归入神话主题');
assert(!characterManifest.objects.some((item) => item.id.startsWith('creature-')), '神话人物媒体仍包含精怪主体');
const characterCoreGear = [
  ['character-wukong-golden-hat', '凤翅紫金冠'],
  ['character-wukong-golden-armor', '锁子黄金甲'],
  ['character-yangjian-hat', '三山飞凤冠'],
  ['character-yangjian-armor', '锁子清源甲'],
];
assert(characterCoreGear.every(([id, section]) => characterManifest.objects.some((item) => item.id === id && item.section === section && item.layout === 'item')), '人物专属头甲没有逐件绑定到对应介绍章节');
assert(!characterManifest.galleries.some((gallery) => ['character-wukong-forged-gear', 'character-yangjian-forged-gear'].includes(gallery.id)), '人物专属头甲仍保留脱节的集中画廊');
assert(!themeManifest.galleries.some((gallery) => gallery.id === 'theme-character-forge-gallery'), '神话主题仍保留人物专属装备画廊');
const mythAssetMapPath = path.join(root, 'data/wiki/shared/myth-asset-map.json');
if (fs.existsSync(mythAssetMapPath)) {
  const mythAssetMap = JSON.parse(fs.readFileSync(mythAssetMapPath, 'utf8'));
  assert(mythAssetMap.schemaVersion === 1 && Array.isArray(mythAssetMap.assets), '神话资产映射结构无效');
  const mappedArt = mythAssetMap.assets.map((item) => item.target.replace(/^myweb-main\//, ''));
  const publishedArt = new Set(artReferences);
  const unpublishedArt = mappedArt.filter((item) => !publishedArt.has(item));
  assert(unpublishedArt.length === 0, `神话标准资产尚未接入页面：${unpublishedArt.join('、')}`);
  assert(new Set(mappedArt).size === mappedArt.length, '神话资产映射包含重复目标');
}

console.log(`Validated ${books.length} books, ${pages.length} pages, ${searchPayload.entries.length} search entries, ${termLinkCount} term links and ${localReferences.length} local references.`);
