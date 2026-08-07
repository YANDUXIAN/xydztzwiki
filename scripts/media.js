// ============================================
// 《腌笃鲜》维基百科 - Media Gallery & Image Lightbox
// ============================================
// 读取 media-manifest.json，将对象图片与演示视频注入对应章节，
// 视频在卡片内按需播放；对象图片保留灯箱查看器。
// 每页只读取当前书册清单；其余书册及图片在访问对应路由前不会请求。

window.XYDZTZ = window.XYDZTZ || {};
window.XYDZTZ.media = {
  BOOKS: {
    'xydztz': '/media/wiki/xydztz/media-manifest.json?v=20260804g',
    'myth-theme': '/data/wiki/myth-theme/media-manifest.json?v=20260808a',
    'myth-characters': '/data/wiki/myth-characters/media-manifest.json?v=20260808a',
  },

  // 条目 ID → 章节标题关键词（对标题做 contains 匹配）
  OBJECT_SECTIONS: {
    'artifact-ttzjhl': '吞天紫金葫芦',
    'artifact-tdbj': '天地宝鉴',
    'artifact-xmyjp': '须弥玉净瓶',
    'artifact-bhz': '辟火罩',
    'futon': '蒲团',
    'cunxin-jingpo': '寸心精魄',
    'armor-madameweb': '喜蛛天罗衣',
    'yutu-winter': '玉兔仙子',
    'blackbear-trueform': '黑风大王·熊罴真身',
  },

  DEMO_ENTRY_SECTIONS: {
    'yuanchen-system': '元辰劫运',
    'fire-tempering': '火元淬炼',
    'futon': '蒲团',
    'armor-madameweb': '喜蛛天罗衣',
    'yuanchen-rat': '子鼠',
    'yuanchen-goat': '未羊',
    'yuanchen-rabbit': '卯兔',
    'yuanchen-ox': '丑牛',
    'yuanchen-dog': '戌狗',
    'yuanchen-pig': '亥猪',
    'yuanchen-monkey': '申猴',
    'yuanchen-tiger': '寅虎',
    'yuanchen-snake': '巳蛇',
    'yuanchen-horse': '午马',
    'yuanchen-dragon': '辰龙',
    'yuanchen-rooster': '酉鸡',
  },

  // 单个演示 → 更精确的子章节（盘丝四局）
  DEMO_ID_SECTIONS: {
    'pansi-wood': '木局',
    'pansi-metal': '金局',
    'pansi-fire': '火局',
    'pansi-water': '水局',
  },

  _manifest: null,
  _lightbox: null,
  _lastTrigger: null,

  async init() {
    const main = document.getElementById('main-content');
    if (!main) return;

    try {
      const bookId = document.body.dataset.bookId || 'xydztz';
      const manifest = this.BOOKS[bookId];
      if (!manifest) return;
      const resp = await fetch(manifest);
      if (!resp.ok) return;
      this._manifest = await resp.json();
    } catch (err) {
      console.warn('当前资料库媒体清单加载失败，跳过媒体注入', err);
      return;
    }

    this.injectObjects(main);
    this.injectCatalogs(main);
    this.injectDemos(main);
  },

  findHeading(main, key) {
    return Array.from(main.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .find((h) => h.textContent.includes(key)) || null;
  },

  // 对象图片紧随标题插入（桌面端右浮动，正文环绕）。
  injectObjects(main) {
    const objects = this._manifest?.objects || [];
    objects.forEach((obj) => {
      const key = obj.section || this.OBJECT_SECTIONS[obj.id];
      if (!key) return;

      const objectCards = () => Array.from(main.querySelectorAll('[data-media-object-id]'))
        .filter((card) => card.dataset.mediaObjectId === obj.id);

      const summaryHeading = Array.from(main.querySelectorAll('.update-summary-item h4'))
        .find((heading) => heading.textContent.includes(key) || heading.textContent.includes(obj.name));
      let hasSummaryCard = false;
      if (summaryHeading) {
        const summaryItem = summaryHeading.closest('.update-summary-item');
        const summaryHead = summaryHeading.closest('.update-summary-head');
        const summaryCard = objectCards().find((card) => card.closest('.update-summary-item') === summaryItem);
        summaryItem.classList.add('has-object-media');
        if (summaryCard) {
          if (summaryCard.parentElement !== summaryItem) summaryHead.after(summaryCard);
          this.enhanceObjectCard(summaryCard, obj);
        } else {
          summaryHead.after(this.buildObjectCard(obj, false));
        }
        hasSummaryCard = true;
      }

      const detailCard = objectCards().find((card) => !card.closest('.update-summary-item'));
      if (detailCard) {
        this.enhanceObjectCard(detailCard, obj);
        return;
      }

      if (hasSummaryCard) return;

      const heading = Array.from(main.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .find((item) => !item.closest('.update-summary-item') && item.textContent.includes(key));
      if (!heading) return;
      heading.after(this.buildObjectCard(obj, obj.caption !== false));
    });
  },

  injectCatalogs(main) {
    const page = document.body.dataset.chapterSlug || '';
    const galleries = (this._manifest?.galleries || []).filter((gallery) => gallery.page === page);
    galleries.forEach((gallery) => {
      const heading = this.findHeading(main, gallery.section);
      if (!heading) return;
      const catalog = this.buildImageCatalog(gallery);
      if (gallery.placement === 'aside') {
        heading.after(catalog);
        return;
      }
      // placement:'lead' 固定在章节门面（引言后、首个下级标题前），不再随引言有无沉到节尾
      const boundary = gallery.placement === 'lead'
        ? this.leadBoundary(heading)
        : this.sectionBoundary(heading);
      if (boundary) boundary.before(catalog);
      else main.appendChild(catalog);
    });
  },

  // 章首落点：遇首个下级标题即插其前；扁平章节遇同级标题，等价于原章节尾落点
  leadBoundary(heading) {
    let node = heading.nextElementSibling;
    while (node) {
      if (/^H[1-6]$/.test(node.tagName)) return node;
      node = node.nextElementSibling;
    }
    return null;
  },

  enhanceObjectCard(figure, obj) {
    if (!figure || figure.dataset.mediaEnhanced === 'true') return;
    const trigger = figure.querySelector('.fig-card-media');
    if (!trigger) return;

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      this.openImage(obj, trigger);
    });
    figure.dataset.mediaEnhanced = 'true';
  },

  // 画廊插入到章节内容末尾；H1 章节置于引言之后、首个 H2 之前。
  injectDemos(main) {
    const demos = this._manifest?.demos || [];
    const groups = new Map();

    demos.forEach((demo) => {
      const key = this.DEMO_ID_SECTIONS[demo.id] || this.DEMO_ENTRY_SECTIONS[demo.entryId];
      if (!key) return;
      const heading = this.findHeading(main, key);
      if (!heading) return;
      if (!groups.has(heading)) groups.set(heading, []);
      groups.get(heading).push(demo);
    });

    groups.forEach((list, heading) => {
      const gallery = this.buildGallery(list);
      const boundary = this.sectionBoundary(heading);
      if (boundary) boundary.before(gallery);
      else main.appendChild(gallery);
    });
  },

  sectionBoundary(heading) {
    const level = Number(heading.tagName.slice(1));
    let node = heading.nextElementSibling;
    let seenContent = false;
    while (node) {
      if (/^H[1-6]$/.test(node.tagName)) {
        const l = Number(node.tagName.slice(1));
        if (l <= level) return node;
        if (seenContent && l === level + 1) return node;
      } else {
        seenContent = true;
      }
      node = node.nextElementSibling;
    }
    return null;
  },

  buildObjectCard(obj, showCaption = true) {
    const figure = document.createElement('figure');
    figure.className = `fig-card${obj.layout ? ` fig-card-${obj.layout}` : ''}`;
    figure.dataset.mediaObjectId = obj.id;
    figure.dataset.mediaEnhanced = 'true';

    const btn = document.createElement('button');
    btn.className = 'fig-card-media';
    btn.type = 'button';
    btn.setAttribute('aria-label', `查看「${obj.name}」大图`);

    const img = document.createElement('img');
    img.src = window.XYDZTZ.utils.siteAsset(obj.image);
    img.alt = obj.name;
    img.width = obj.width || 640;
    img.height = obj.height || 640;
    img.loading = 'lazy';

    btn.appendChild(img);
    btn.addEventListener('click', () => this.openImage(obj, btn));

    figure.appendChild(btn);
    if (showCaption) {
      const caption = document.createElement('figcaption');
      const name = document.createElement('span');
      name.className = 'fig-card-name';
      name.textContent = obj.name;
      caption.appendChild(name);
      figure.appendChild(caption);
    }
    return figure;
  },

  buildImageCatalog(gallery) {
    const section = document.createElement('section');
    section.className = `media-catalog media-catalog-${gallery.layout || 'catalog'}`;
    section.classList.toggle('is-single', gallery.items.length === 1);
    section.dataset.mediaGalleryId = gallery.id;

    const heading = document.createElement('h5');
    heading.className = 'media-catalog-title';
    heading.textContent = gallery.title;
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'media-catalog-grid';
    gallery.items.forEach((item) => {
      const button = document.createElement('button');
      button.className = 'media-catalog-item';
      button.type = 'button';
      button.setAttribute('aria-label', `查看「${item.name}」大图`);

      const image = document.createElement('img');
      image.src = window.XYDZTZ.utils.siteAsset(item.image);
      image.alt = item.name;
      image.width = item.width || 480;
      image.height = item.height || 480;
      image.loading = 'lazy';
      image.decoding = 'async';

      const label = document.createElement('span');
      label.textContent = item.name;
      button.appendChild(image);
      button.appendChild(label);
      button.addEventListener('click', () => this.openImage(item, button, gallery.title));
      grid.appendChild(button);
    });
    section.appendChild(grid);
    return section;
  },

  buildGallery(demos) {
    const wrap = document.createElement('section');
    wrap.className = 'media-gallery';
    if (demos.length === 2) wrap.classList.add('is-pair');

    const inner = document.createElement('div');
    inner.className = 'media-gallery-inner';

    const grid = document.createElement('div');
    grid.className = 'media-demo-grid';
    if (demos.length === 1) grid.classList.add('single');

    demos.forEach((demo) => grid.appendChild(this.buildDemoCard(demo)));

    inner.appendChild(grid);
    wrap.appendChild(inner);
    return wrap;
  },

  buildDemoCard(demo) {
    const card = document.createElement('article');
    card.className = 'media-demo-card';
    card.dataset.demoId = demo.id;

    const trigger = document.createElement('button');
    trigger.className = 'media-demo-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', `在当前位置播放演示「${demo.title}」`);

    const media = document.createElement('span');
    media.className = 'media-demo-media';

    const poster = document.createElement('img');
    poster.className = 'media-demo-poster';
    poster.src = window.XYDZTZ.utils.siteAsset(demo.poster);
    poster.alt = '';
    poster.width = demo.width || 960;
    poster.height = demo.height || 540;
    poster.loading = 'lazy';
    poster.decoding = 'async';

    const play = document.createElement('span');
    play.className = 'media-demo-play';
    play.setAttribute('aria-hidden', 'true');
    media.appendChild(poster);
    media.appendChild(play);

    trigger.appendChild(media);
    trigger.addEventListener('click', () => this.playDemoInline(demo, card, trigger));
    card.appendChild(trigger);
    return card;
  },

  playDemoInline(demo, card, trigger) {
    if (card.classList.contains('is-playing')) return;

    const video = document.createElement('video');
    video.className = 'media-demo-video';
    video.src = window.XYDZTZ.utils.siteAsset(demo.video);
    video.poster = window.XYDZTZ.utils.siteAsset(demo.poster);
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('aria-label', `演示：${demo.title}`);
    if (demo.width) video.width = demo.width;
    if (demo.height) video.height = demo.height;

    video.addEventListener('play', () => this.pauseOtherDemos(video));
    card.classList.add('is-playing');
    trigger.replaceWith(video);
    this.pauseOtherDemos(video);

    const playRequest = video.play();
    if (playRequest?.catch) playRequest.catch(() => {});
  },

  pauseOtherDemos(activeVideo) {
    document.querySelectorAll('.media-demo-video').forEach((video) => {
      if (video !== activeVideo && !video.paused) video.pause();
    });
  },

  // ---------- 灯箱 ----------

  ensureLightbox() {
    if (this._lightbox) return this._lightbox;

    const lb = document.createElement('div');
    lb.className = 'media-lightbox';
    lb.hidden = true;
    lb.innerHTML = `
      <div class="media-lightbox-backdrop" aria-hidden="true"></div>
      <figure class="media-lightbox-dialog" role="dialog" aria-modal="true" aria-label="媒体查看器">
        <button class="media-lightbox-close" type="button" aria-label="关闭">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div class="media-lightbox-stage"></div>
        <figcaption class="media-lightbox-caption">
          <span class="media-lightbox-title"></span>
          <span class="media-lightbox-cat"></span>
        </figcaption>
      </figure>
    `;
    document.body.appendChild(lb);

    const close = () => this.closeLightbox();
    lb.querySelector('.media-lightbox-close').addEventListener('click', close);
    lb.querySelector('.media-lightbox-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
      if (lb.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        event.preventDefault();
        lb.querySelector('.media-lightbox-close').focus();
      }
    });

    this._lightbox = lb;
    return lb;
  },

  openLightbox(trigger, buildStage, captionTitle, captionCat) {
    const lb = this.ensureLightbox();
    const stage = lb.querySelector('.media-lightbox-stage');
    stage.innerHTML = '';
    stage.appendChild(buildStage());

    const caption = lb.querySelector('.media-lightbox-caption');
    lb.querySelector('.media-lightbox-title').textContent = captionTitle || '';
    lb.querySelector('.media-lightbox-cat').textContent = captionCat || '';
    caption.hidden = !captionTitle && !captionCat;

    this._lastTrigger = trigger || null;
    lb.hidden = false;
    document.body.classList.add('media-lightbox-open');
    lb.querySelector('.media-lightbox-close').focus();
  },

  closeLightbox() {
    const lb = this._lightbox;
    if (!lb || lb.hidden) return;

    lb.querySelector('.media-lightbox-stage').innerHTML = '';
    lb.hidden = true;
    document.body.classList.remove('media-lightbox-open');

    if (this._lastTrigger && document.contains(this._lastTrigger)) {
      this._lastTrigger.focus();
    }
    this._lastTrigger = null;
  },

  openImage(obj, trigger, category = '') {
    this.openLightbox(trigger, () => {
      const img = document.createElement('img');
      img.src = window.XYDZTZ.utils.siteAsset(obj.image);
      img.alt = obj.name;
      img.className = 'media-lightbox-image';
      return img;
    }, obj.name, category);
  },
};
