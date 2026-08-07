const books = [
  {
    id: 'xydztz',
    title: '腌笃鲜',
    source: 'content.md',
    manifest: 'media/wiki/xydztz/media-manifest.json',
    pages: [
      {
        title: '模组介绍', eyebrow: '第壹篇', slug: 'intro', output: 'index.html', url: '/',
        description: '了解《腌笃鲜》模组的核心特色、近期更新与前置需求。',
        source: { mode: 'h2', title: '模组介绍' },
      },
      {
        title: '核心系统', eyebrow: '第贰篇', slug: 'systems', output: 'systems/index.html', url: '/systems/',
        description: '查阅《腌笃鲜》的元辰劫运、十二元辰神通、四象三合局与火元淬炼系统。',
        source: { mode: 'h2', title: '核心系统' },
      },
      {
        title: '人物精怪', eyebrow: '第叁篇', slug: 'characters', output: 'characters/index.html', url: '/characters/',
        description: '查阅《腌笃鲜》人物精怪资料，包括玉兔仙子与黑风大王·熊罴真身。',
        source: { mode: 'h2', title: '人物精怪' },
      },
      {
        title: '法宝装备', eyebrow: '第肆篇', slug: 'artifacts', output: 'artifacts/index.html', url: '/artifacts/',
        description: '查阅《腌笃鲜》的法宝、装备与专属物品资料。',
        source: { mode: 'h2', title: '法宝装备' },
      },
      {
        title: '神话优化', eyebrow: '第伍篇', slug: 'optimizations', output: 'optimizations/index.html', url: '/optimizations/',
        description: '查阅《腌笃鲜》对神话人物、主题机制、性能与操作体验的优化。',
        source: { mode: 'h2', title: '神话优化' },
      },
      {
        title: '兼容修复', eyebrow: '第陆篇', slug: 'compatibility', output: 'compatibility/index.html', url: '/compatibility/',
        description: '查阅《腌笃鲜》的兼容修复、轮盘技能适配与常见问题排错。',
        source: { mode: 'h2', title: '兼容修复' },
      },
    ],
  },
  {
    id: 'myth-theme',
    title: '神话主题',
    source: 'myth-theme.md',
    manifest: 'data/wiki/myth-theme/media-manifest.json',
    pages: [
      {
        title: '主题总览', eyebrow: '第壹篇', slug: 'myth-theme-overview', output: 'myth-theme/index.html', url: '/myth-theme/',
        description: '《神话书说》非官方资料整理：版本基线、内容边界与主题资料导航。',
        source: { mode: 'h1', sections: ['《神话书说》主题百科'], drop: ['《神话书说》主题百科'] },
      },
      {
        title: '世界地点', eyebrow: '第贰篇', slug: 'myth-theme-world', output: 'myth-theme/world/index.html', url: '/myth-theme/world/',
        description: '查阅《神话书说》桃岛、广寒宫与青竹洲的生成、环境和资源规则。',
        source: { mode: 'h1', sections: ['世界与地点', '桃岛', '广寒宫', '青竹洲'], drop: ['世界与地点'] },
      },
      {
        title: 'NPC 与交互', eyebrow: '第叁篇', slug: 'myth-theme-npcs', output: 'myth-theme/npcs/index.html', url: '/myth-theme/npcs/',
        description: '查阅《神话书说》太上老君、嫦娥、土地庙及共享交互规则。',
        source: { mode: 'h1', sections: ['NPC、好感与共享交互', '太上老君', '嫦娥', '土地庙与土地公'], drop: ['NPC、好感与共享交互'] },
      },
      {
        title: '首领与怪物', eyebrow: '第肆篇', slug: 'myth-theme-creatures', output: 'myth-theme/creatures/index.html', url: '/myth-theme/creatures/',
        description: '查阅《神话书说》黑风大王、犀牛三大王、聚宝金蟾、子圭玄鸟与年兽资料。',
        source: { mode: 'h1', sections: ['首领与怪物', '黑风大王', '犀牛三大王', '聚宝金蟾', '子圭玄鸟', '年兽'], drop: ['首领与怪物'] },
      },
      {
        title: '炼丹与法宝', eyebrow: '第伍篇', slug: 'myth-theme-artifacts', output: 'myth-theme/artifacts/index.html', url: '/myth-theme/artifacts/',
        description: '查阅《神话书说》的八卦炉、常规丹药与通用法宝。',
        source: { mode: 'h1', sections: ['炼丹与通用法宝'], drop: ['炼丹与通用法宝'] },
      },
      {
        title: '农业与料理', eyebrow: '第陆篇', slug: 'myth-theme-agriculture', output: 'myth-theme/agriculture/index.html', url: '/myth-theme/agriculture/',
        description: '查阅《神话书说》的主题植物、人参果树、农业与料理资料。',
        source: { mode: 'h1', sections: ['农业与料理', '人参果树', '主题料理'], drop: ['农业与料理'] },
      },
      {
        title: '建筑与生态', eyebrow: '第柒篇', slug: 'myth-theme-buildings', output: 'myth-theme/buildings/index.html', url: '/myth-theme/buildings/',
        description: '查阅《神话书说》的建筑、容器、摇钱树与青竹小店规则。',
        source: { mode: 'h1', sections: ['建筑与生态', '摇钱树', '青竹小店'], drop: ['建筑与生态'] },
      },
      {
        title: '腾云与技能', eyebrow: '第捌篇', slug: 'myth-theme-flight', output: 'myth-theme/flight/index.html', url: '/myth-theme/flight/',
        description: '查阅《神话书说》的技能书解锁、腾云与人物专属飞行规则。',
        source: { mode: 'h1', sections: ['腾云与技能'], drop: ['腾云与技能'] },
      },
    ],
  },
  {
    id: 'myth-characters',
    title: '神话人物',
    source: 'myth-characters.md',
    manifest: 'data/wiki/myth-characters/media-manifest.json',
    pages: [
      {
        title: '人物总览', eyebrow: '第壹篇', slug: 'myth-characters-overview', output: 'myth-characters/index.html', url: '/myth-characters/',
        description: '《神话人物》非官方资料整理：人物总览、共通规则、版本基线与内容边界。',
        source: { mode: 'h1', sections: ['《神话人物》百科'], drop: ['《神话人物》百科'], omitHeadings: ['人物总览'] },
      },
      {
        title: '孙悟空', eyebrow: '第贰篇', slug: 'sun-wukong', output: 'myth-characters/sun-wukong/index.html', url: '/myth-characters/sun-wukong/',
        description: '查阅孙悟空的属性、金箍棒、身外身法、专属装备与筋斗云。',
        source: { mode: 'h1', sections: ['孙悟空'], drop: ['孙悟空'] },
      },
      {
        title: '哪吒', eyebrow: '第叁篇', slug: 'nezha', output: 'myth-characters/nezha/index.html', url: '/myth-characters/nezha/',
        description: '查阅哪吒的属性、三件初始法宝与风火轮规则。',
        source: { mode: 'h1', sections: ['哪吒'], drop: ['哪吒'] },
      },
      {
        title: '白骨夫人', eyebrow: '第肆篇', slug: 'white-bone', output: 'myth-characters/white-bone/index.html', url: '/myth-characters/white-bone/',
        description: '查阅白骨夫人的双形态、尸体处理、骨衣、骨宠与复活规则。',
        source: { mode: 'h1', sections: ['白骨夫人'], drop: ['白骨夫人'] },
      },
      {
        title: '猪八戒', eyebrow: '第伍篇', slug: 'pigsy', output: 'myth-characters/pigsy/index.html', url: '/myth-characters/pigsy/',
        description: '查阅猪八戒的饥饿分段、农务、九齿钉耙、形态与飞行规则。',
        source: { mode: 'h1', sections: ['猪八戒'], drop: ['猪八戒'] },
      },
      {
        title: '杨戬', eyebrow: '第陆篇', slug: 'yangjian', output: 'myth-characters/yangjian/index.html', url: '/myth-characters/yangjian/',
        description: '查阅杨戬、哮天犬、天眼、三尖两刃刀与飞行规则。',
        source: { mode: 'h1', sections: ['杨戬'], drop: ['杨戬'] },
      },
      {
        title: '玉兔', eyebrow: '第柒篇', slug: 'yutu', output: 'myth-characters/yutu/index.html', url: '/myth-characters/yutu/',
        description: '查阅玉兔的捣药、药粉、莹月琵琶、兔洞与霜玉云规则。',
        source: { mode: 'h1', sections: ['玉兔'], drop: ['玉兔'] },
      },
      {
        title: '黑白无常', eyebrow: '第捌篇', slug: 'yama-commissioners', output: 'myth-characters/yama-commissioners/index.html', url: '/myth-characters/yama-commissioners/',
        description: '查阅黑白无常的双形态、阎罗雕像、魂魄与无常法器。',
        source: { mode: 'h1', sections: ['黑白无常'], drop: ['黑白无常'] },
      },
      {
        title: '盘丝娘娘', eyebrow: '第玖篇', slug: 'madameweb', output: 'myth-characters/madameweb/index.html', url: '/myth-characters/madameweb/',
        description: '查阅盘丝娘娘的蛛丝值、蛛后形态、蛛网、专属物品与盘丝吊。',
        source: { mode: 'h1', sections: ['盘丝娘娘'], drop: ['盘丝娘娘'] },
      },
    ],
  },
];

module.exports = { books };
