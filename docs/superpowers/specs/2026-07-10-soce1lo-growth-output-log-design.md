# Soce1lo 成长输出日志与知识管道出口设计

## 目标

把 BlogSite 从通用“公开知识库”调整为 Soce1lo 的个人成长输出站点。网站记录一个人如何思考、学习和构建，并让偏爱独立判断、长期主义、结构化理解和真实复盘的读者快速识别到同频气质。

BlogSite 是 Obsidian KnowledgeVault 的公开输出端，不是 Vault 的网页镜像。输入、Daily、处理中间稿、私人项目和 LLM 派生内容默认保持私有；只有经过人工选择、匿名化、发布授权和同步检查的成果进入网站。

## 设计依据

本设计以 2026-07-10 的两个真实工作区为依据：

- BlogSite 已有 Astro 6、`blog` / `notes` / `projects` 三个集合、Vault 只读同步、发布检查、RSS、搜索、明暗主题和 Ink & Signal 视觉系统。
- Vault 当前实际包含 371 篇归档 Daily、43 篇迁移 Inbox、68 篇 Notes、51 篇 Projects、1 篇 Area、76 篇 Resources、6 篇 MOC 和 4 篇已发布文章。
- `02-Weekly` 尚无实际周回顾；新的手工 Daily 尚未形成持续输入。
- 最近形成的 C 语言 MOC、Resource 和三篇 Notes 是“来源 → 综合理解 → 主题导航”的有效案例。
- `70-LLM-Wiki` 已形成 `raw → source → concept → synthesis → 人工 promote` 的派生加工路径。
- `60-Publish` 已形成 4 篇公开文章，但当前输出集中在知识管理主题，真实公开 Notes 和 Projects 尚未建立。
- BlogSite 同步器已经支持 `blog`、`notes`、`projects` 三类输出，无需增加数据库或新内容系统。

文档中的历史数量与当前文件系统不一致时，以本次只读扫描结果为准。

## 核心判断

1. 网站的主角是 Soce1lo，而不是知识库目录或技术栈。
2. 个人成长通过公开输出之间的时间关系和判断变化呈现，不公开原始 Daily。
3. `blog`、`notes`、`projects` 是输出格式；长期主题是跨格式的第二层组织。
4. 首页首先回答“这个人是谁、现在关注什么、最近产生了什么输出”。
5. 公开内容保持高信号密度，不展示虚假进度、空研究方向或未经授权的中间过程。
6. 现有 Ink & Signal 视觉基础保留，个性来自结构和文字，而不是换一套装饰性主题。

## 知识管道

```text
经历 / 问题 / 外部资料 / 项目事件
                │
                ▼
捕捉：Daily / Inbox / LLM Wiki Raw
                │
                ▼
复盘：Weekly / 项目阶段复盘
                │
                ▼
加工：Resources → Notes
      项目过程 → Projects
      跨主题理解 → MOCs
      来源密集任务 → LLM Wiki → 人工 Promote
                │
                ▼
策划：50-MOCs/发布内容索引.md
                │
                ▼
授权：60-Publish，draft → published
                │
                ▼
验证：preview sync → manifest → test/check/build
                │
                ▼
BlogSite：思考 / 学习 / 项目 / 成长轨迹
```

BlogSite 只展示管道末端的人工授权成果。管道机制在 About 页面简要说明，不在首页暴露来源路径、处理日志或私人上下文。

## 品牌与文字

### 站点品牌

- 主品牌：`Soce1lo`
- 英文副标识：`Growth Output Log`
- 中文副标识：`成长输出日志`
- 首屏眉题：`SOCE1LO / GROWTH OUTPUT LOG`
- 首屏标题：`记录我如何理解、学习与构建。`
- 首屏说明：`这里是我的知识管道的公开输出端。我把经历中的思考、学到的技术和做过的项目，整理成可复用、可追踪的长期记录。`
- 隐私边界：`输入留在私人系统，输出经过选择后公开。`

### 语气

- 理性外壳、真实内层。
- 使用具体判断和主动语态，不写营销式自我评价。
- 可以展示失败、修正和边界，不维持虚假的一贯正确。
- INTJ 可以在 About 中作为自我理解的背景出现，不作为首页徽章或视觉主题。

## 公开信息架构

### 全局导航

| 标签 | 路由 | 语义 |
| --- | --- | --- |
| 思考 | `/blog/` | 长文、经历、判断与复盘 |
| 学习 | `/notes/` | 已经自洽、可复用的技术理解 |
| 项目 | `/projects/` | 目标、决策、实施、结果与阶段复盘 |
| 主题 | `/tags/` | 跨输出格式的主题探索入口 |
| 关于 | `/about/` | 个人定位、工作原则、知识管道和公开边界 |

现有 URL、集合名和 GitHub Pages base path 保持不变，只改变面向读者的标签和内容层级。

### 首页

首页按以下顺序组织：

1. **Identity / 身份与主张**
   - Soce1lo、首屏标题、说明和 RSS。
   - 桌面端右侧显示一条人工维护、明确公开的 `NOW` 状态。
   - 首个状态使用：`正在把个人知识系统整理成可持续的成长输出管道。`
2. **Output Log / 最近输出**
   - 合并三个公开集合，按 `updatedDate ?? pubDate` 倒序。
   - 以年月分组，默认展示最近 8 条。
   - 每条显示日期、输出类型、标题、摘要和一个主要主题。
   - 它本身就是第一阶段的成长时间线，不新增空的 Timeline 页面。
3. **Long Threads / 长期主题**
   - 由人工定义的公开主题配置关联 `topic`、`series` 或 tags。
   - 只展示至少有一条公开输出的主题。
   - 第一条主题为“知识系统”，匹配 `series: KnowledgeVault 实践`、`topic: Obsidian | LLM Wiki` 或 `knowledge-management` tag；后续方向有公开成果后再加入。
4. **Selected / 代表性成果**
   - 最多 3 条，由公开 profile 配置显式选择。
   - 初始选择为 `blog/logseq-to-obsidian-migration`、`blog/llm-wiki-derived-layer` 和 `blog/obsidian-local-markdown-knowledge-vault`。
   - 无有效选择时整段隐藏，不自动用“最热门”内容替代。
5. **Archive / 完整档案**
   - 思考、学习、项目、主题和 RSS 的稳定入口。
   - 不显示内容总量卡片，不把数量包装成成长指标。

### About

About 页面包含：

- Soce1lo 的简短个人定位：长期建设者、研究型工程师、INTJ。
- 关注方式：独立判断、结构化理解、长期维护和可验证结果。
- 知识管道的公开版流程图。
- “公开什么 / 不公开什么”的明确边界。
- 当前技术栈只作为工作手段简述，不写成技能墙。
- RSS 订阅入口；不在第一阶段引入评论、联系表单或社交计数。

## 输出类型

公开输出使用四种语义：

| Kind | 中文 | 默认来源 | 说明 |
| --- | --- | --- | --- |
| `thought` | 思考 | `blog` | 判断、经历、长文和复盘 |
| `learned` | 学习 | `notes` | 已形成的技术理解和可复用笔记 |
| `built` | 项目 | `projects` | 项目、工具、交付和阶段结果 |
| `revised` | 修正 | 显式指定 | 对过去判断的公开修订 |

BlogSite 内容 schema 增加可选 `outputKind`。Vault 同步器读取可选 flat 字段 `publish_kind`；缺少该字段时按 collection 默认映射。当前 Vault 不因本次 Blog 改造被自动修改，未来只在用户明确编辑发布稿时增加 `publish_kind`。

`revised` 不建立新集合。它表示一次输出的语义，仍归属于 blog、notes 或 projects 之一。

## 视觉系统

视觉概念为 **Trace / 一个人持续变化留下的轨迹**。

### 保留

- Ink & Signal 的 Paper、Sheet、Ink、Slate、Signal 调色板。
- 中文衬线展示标题、无衬线正文、等宽元数据。
- 现有明暗主题、搜索、阅读进度、文章目录和响应式阅读体验。
- 现有 token 驱动的颜色与间距边界。

### 新的标志性结构

Output Log 使用一条连续的成长脊线：年份/月、轨迹节点、输出类型和内容形成同一阅读轴。它只用于首页和未来可能出现的年月归档页。

- Signal 色只用于链接、当前状态、焦点和轨迹节点。
- 输出类型使用单色文字标记，不引入彩虹分类色。
- 悬停时轨迹节点由空心变实心；不使用卡片漂浮和大幅位移。
- `prefers-reduced-motion: reduce` 时取消非必要过渡。
- 页面不加入头像大图、技能进度条、GitHub 热力图、MBTI 图案、统计仪表盘或装饰性渐变。

### 品牌标记

- 导航和页面标题使用 `Soce1lo`，不再显示 `BlogSite` 作为对外品牌。
- 浏览器标题、RSS 标题和默认描述同步更新。
- favicon 改为简洁的 `S` 字母标记；它只承担小尺寸识别，不扩展为复杂 Logo 系统。

## 代码与数据边界

### 新增单元

- `src/data/site-profile.ts`
  - 保存公开身份、NOW、长期主题和代表性成果引用。
  - 不读取 Vault、环境变量或私人文件。
- `src/lib/output.ts`
  - 负责输出类型映射、公开条目排序、年月分组、长期主题关联和代表性成果解析。
  - 保持为无 UI 依赖的纯函数，便于测试。
- `src/components/OutputLog.astro`
  - 只负责成长脊线和最近输出渲染。
- `src/components/LongThreads.astro`
  - 只负责已有公开成果的长期主题入口。

### 修改单元

- `src/pages/index.astro`：使用新的个人首页结构。
- `src/layouts/BaseLayout.astro`：更新品牌、导航标签、SEO 默认值和页脚边界文案。
- `src/pages/about.astro`：更新个人定位和公开知识管道说明。
- `src/pages/blog/index.astro`、`src/pages/notes/index.astro`、`src/pages/projects/index.astro`：将读者可见标题统一为思考、学习、项目，并保持原路由。
- `src/pages/blog/[...slug].astro`、`src/pages/notes/[...slug].astro`、`src/pages/projects/[...slug].astro`：同步详情页的返回标签与 sectionLabel。
- `src/pages/rss.xml.js`：更新 RSS 品牌信息，并合并三个集合中的公开输出，使 RSS 与首页 Output Log 语义一致。
- `src/content.config.ts`：增加可选 `outputKind`。
- `scripts/utils/vault-index.ts`、`scripts/utils/frontmatter.ts`、`scripts/sync-from-vault.ts`：支持可选 `publish_kind` 到 `outputKind` 的稳定映射。
- `src/styles/tokens.css`、`src/styles/global.css`：增加首页轨迹布局所需 token 和样式，复用现有颜色系统。
- `public/favicon.svg`：改为 Soce1lo 的简洁小尺寸标记。
- 相邻测试：覆盖新数据逻辑、同步映射、页面结构和隐私边界。

不引入 UI 框架、客户端状态库、数据库、远程字体、分析脚本或新的运行时网络请求。

当前工作树已经存在文章 H1、标签页、About 和样式优化改动。实施时必须把这些改动视为基线逐项合并，不得还原、覆盖或把它们误判为本设计新产生的修改。

## 当前公开内容处理

当前真实 Vault 同步输出继续保留。以下 starter 内容不代表 Soce1lo 的知识管道输出：

- `welcome-to-blogsite.md`
- `content-boundaries.md`
- `blogsite-v1.md`

第一阶段把它们改为 `visibility: unlisted`，使其不再进入首页、集合列表、标签和 RSS；详情 URL 暂时保留，避免无必要的破坏性删除。Notes 或 Projects 暂时没有真实公开内容时，集合页显示克制的空状态，首页不显示空栏目。

## 空状态、错误与隐私

- 所有公开聚合必须先通过 `isPublicEntry()`；draft、unlisted 和 private 来源不得进入首页。
- `NOW` 只能来自 `site-profile.ts` 的人工公开文本，不从 Daily、任务或 git 状态自动生成。
- 长期主题没有匹配公开条目时自动隐藏。
- 代表性成果引用使用 `{ collection, id }`，若目标不存在、unlisted 或 draft，构建必须失败，避免静默展示错误内容。
- 缺少 `publish_kind` 时使用稳定默认映射；非法值在同步候选检查阶段产生错误，不进入输出。
- 页面在三个集合都为空时仍能渲染身份、NOW、公开边界和档案入口。
- About 只解释流程，不显示 Vault 绝对路径、私人文件名、raw source 清单或 LLM 操作日志。
- Vault 同步继续只读；GitHub Actions 继续只构建仓库中的公开副本。

## 响应式与无障碍

- 验证宽度：390px、768px、1440px。
- 移动端成长脊线保留时间顺序，年月进入独立行，不压缩标题可读宽度。
- 触控目标不小于 40px，焦点样式清晰。
- 标题顺序保持语义化；Output Log 使用有序列表和可理解的时间元素。
- 关闭 CSS 或 JavaScript 时，身份、内容标题、时间和链接仍可读。
- Light / dark 均检查正文、元数据、轨迹线、焦点和空状态对比度。

## 测试与验收

### 自动化

- 为 `src/lib/output.ts` 增加纯函数测试：
  - 三集合合并与稳定排序；
  - `updatedDate` 优先；
  - 年月分组；
  - 默认和显式 output kind；
  - 长期主题只关联公开内容；
  - 无效代表性成果引用失败。
- 扩展 Vault 同步测试：
  - 合法 `publish_kind` 映射；
  - 缺省值兼容；
  - 非法值阻止同步；
  - manifest 和公开路径不泄露私人数据。
- 扩展主题渲染测试：
  - `Soce1lo` 品牌、导航、首屏、NOW、Output Log、长期主题和 About 管道存在；
  - starter 内容不进入公开列表；
  - 首页不再渲染内容数量卡片；
  - 原有搜索、主题、文章目录和 canonical H1 行为不回归。
- 扩展 RSS 测试：
  - RSS 标题使用 Soce1lo 品牌；
  - 公开 blog、notes、projects 均可进入 feed；
  - draft、unlisted 和 starter 内容不得进入 feed。
- 运行：
  - `pnpm test`
  - `pnpm check:publish`
  - `pnpm build`
  - `git diff --check`

### 视觉与交互

- 在 390px、768px、1440px 下检查首页、About、思考列表、学习空状态、项目空状态和文章详情。
- Light / dark 各检查一遍。
- 检查无横向溢出、控制台错误或页面错误。
- 验证主题切换、搜索焦点、标签链接、RSS 和 GitHub Pages base path。
- 人工确认五秒内可以回答：Soce1lo 是谁、现在关注什么、最近输出了什么。

## 长期演进

### 第一阶段：真实个人出口

- 完成本设计中的首页、品牌、About、Output Log、公开主题和 starter 内容收敛。
- 只使用现有已授权公开成果，不为填满页面制造内容。

### 第二阶段：真实 Notes 与 Projects

- 当 Vault 中形成适合公开的技术笔记和项目复盘时，分别通过 `publish_target: notes` 与 `publish_target: projects` 进入网站。
- 当任一长期主题积累至少 3 条公开输出时，再考虑独立主题详情页。

### 第三阶段：成长档案

- 有持续半年以上的公开输出后，再增加按年月浏览和年度回顾。
- NOW 历史只有在用户显式发布快照后才保留；不自动抓取私人状态。
- 关系图、年度统计和更多交互只有在真实内容证明有价值时再引入。

## 完成标准

设计完成的实现必须同时满足：

1. 对外品牌已经从 BlogSite 变为 Soce1lo。
2. 首页以个人主张、NOW 和跨集合 Output Log 为主要内容。
3. 只展示已授权公开输出，不暴露 Vault 中间过程。
4. 现有真实公开文章正常访问，starter 内容退出公开索引。
5. 页面可以随 Notes、Projects、主题和时间自然增长，不需要改写首页结构。
6. 自动化门禁、视觉检查、响应式、无障碍、搜索、RSS、主题和 Pages 子路径均通过验证。
7. Vault 保持只读，BlogSite 的现有未相关修改不被覆盖或误提交。
