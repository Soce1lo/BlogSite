---
title: 从 Logseq 到 Obsidian：迁移回顾
description: 回顾一次 Logseq 到 Obsidian 的真实知识库迁移：边界、批次、验证、踩坑和最终闭环。
pubDate: '2026-07-01'
updatedDate: '2026-08-08'
draft: false
category: Knowledge Management
tags:
  - obsidian
  - logseq
  - knowledge-management
  - migration
visibility: public
sourceVaultPath: 60-Publish/从 Logseq 到 Obsidian：迁移回顾.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: thought
series: KnowledgeVault 实践
seriesOrder: 20
topic: Obsidian
---
# 从 Logseq 到 Obsidian：迁移回顾

把 Logseq 中积累的笔记搬到 Obsidian，表面上只是换一套目录。真正动手后，我发现这更像一次小型数据迁移：源数据不能丢，链接不能悄悄失效，转换规则要稳定，出了问题还得能退回去重做。

这批数据从 2022 年延续到 2026 年。整个 Logseq graph 大约 155 MB，除了 pages、journals 和 assets，还混着配置、白板、备份和历史备份。如果直接找一个导入工具跑到底，速度可能更快，但我很难回答几个基本问题：到底迁了多少文件？哪些内容被改过？附件有没有漏？脚本出错后怎么恢复？

所以这次我没有追求“一键导入”，而是把迁移拆成一组可以检查、可以提交、也可以推倒重来的小批次。后面又补了一轮分类，把“数据已经搬进来”推进到“这些笔记可以在新 Vault 里继续使用”。

这篇只做迁移回顾：为什么这样迁、哪里容易出错、最后怎样闭环。具体命令和完整脚本我拆到另一篇《从 Logseq 到 Obsidian：具体迁移指导》里，避免把一次性迁移工具混进日常写作检查。

专题入口：[Obsidian 个人知识管理专题](../obsidian-personal-knowledge-management-skill/)。

补充说明：这篇记录的是迁移当时的工程过程。迁移闭环后，我又把原始 Logseq graph 从当前 `master` 工作树移除，只保留迁移脚本、测试、报告和基线作为历史归档。复现 Phase 2 时需要使用仓库外 raw snapshot。

## 先定边界，再碰数据

迁移开始前，我先定了几条规则。

第一，原始数据只归档，不修改。Logseq graph 会完整复制到 raw archive，后面的所有转换都以这份快照为输入。哪怕迁移产物全部删掉，也能从 raw archive 重新生成。

第二，机械迁移和知识整理分开。Pages 先统一进入 Inbox，journals 统一进入 Daily，正文不总结、不改写，也不根据内容自动分类。迁移和整理是两件事，混在一起只会让问题难以定位。

第三，每批单独提交。Assets、各年份 journals、分页 pages、后续结构分类都有独立报告和 Git commit。某一批出错时，可以只回滚这一批。

第四，报告只记事实。成功项记录数量，异常项记录路径和原因，不把笔记正文复制进报告。

这些约束看起来保守，但它们解决了迁移里最麻烦的问题：当结果不对时，我知道应该从哪里查，也知道怎样恢复。

## 先搭好 Obsidian 的落点

在导入任何 Logseq 内容之前，我先把 Obsidian Vault 的基础结构搭好，包括 Inbox、Daily、Notes、Projects、Areas、Resources、MOCs、Archive、Attachments、Templates 和系统目录。

模板统一使用扁平 frontmatter。来源和发布信息都展开成普通字段，不使用嵌套的 `source` 或 `publish`：

```yaml
source_type: logseq
source_from: "pages/example.md"
publish_target: none
publish_status: private
```

这样做不是为了让 YAML 更好看，而是为了让 Obsidian Properties、后续脚本和未来的发布工具都能稳定读取。发布字段虽然已经预留，但迁移内容默认保持私有，也不会因为 Logseq 中存在 `public:: true` 就自动进入发布流程。

## 摸清家底

正式归档前，我先对源目录做了一轮只读扫描。清理完失效引用后，核心输入是：

| 类型 | 数量 |
|---|---:|
| Pages | 238 |
| Journals | 372 |
| Assets | 210 |

Journals 中有 1 个空文件，按规则跳过。迁移前还检查了附件引用、文件编码、日期命名、Logseq 属性、任务状态和 block refs。

快照归档时排除了 `.git` 指针和 `.DS_Store`。最终 raw archive 包含 1462 个文件，共 157979622 字节。归档前后使用同一套 aggregate SHA-256 计算方式，文件数、字节数和指纹必须同时一致。

## Phase 2：先把数据安全迁进来

Phase 2 一共分为四段。

### 归档 raw graph

先连续计算两次源目录指纹，确认 Logseq 没有在后台继续写文件。然后复制完整 graph，再对归档目录重新计算指纹。三次结果一致后，raw archive 才算成立。

### 迁移 assets

210 个附件保持原文件名、目录和格式，不压缩，也不做重新分类。复制后逐文件比较大小和 SHA-256，而不是只检查目标目录里“看起来有文件”。

### 按年份迁移 journals

Journals 按 2022、2023、2024、2025、2026 五个批次处理。文件名从 `YYYY_MM_DD.md` 转换为 `YYYY-MM-DD.md`，添加轻量 frontmatter，但不套用新的 Daily 模板。

最终迁移 371 个 journals，跳过 1 个空文件。

### 分批迁移 pages

Pages 按 UTF-8 文件名字节稳定排序，再拆成 `50 + 50 + 50 + 50 + 38` 五批。所有文件先进入 Inbox，不在迁移阶段判断它究竟属于 Note、Project、Area 还是 Resource。

稳定排序很重要。同一份 raw archive 无论执行多少次，同一个文件都应该落在同一个批次里，否则报告和回滚范围会不断变化。

## 机械转换做了什么

转换脚本只处理事先约定的语法：

- 给 609 个 Markdown 文件添加扁平 frontmatter；
- 将 `tags::`、`alias::`、`description::` 转为 Obsidian Properties；
- 移除 25 条 `public::`，但不生成发布状态；
- 将 358 条 Logseq 任务转换为 Markdown task；
- 重写 193 条附件链接；
- 保留 Wikilinks；
- 保留没有明确转换规则的 Logseq 语法，并在报告中计数。

最后一条是刻意为之。迁移脚本不应该对自己不理解的语法自作主张。此次共有 324 处 `collapsed::`、`id::`、renderer 等语法被原样保留，它们可能需要后续整理，但不应该在机械迁移时消失。

## 两个差点破坏内容的细节

迁移中真正麻烦的不是文件数量，而是两处很小的边界问题。

### Shell 算术不是 block ref

最初的 block ref 正则写得太宽，只要看到 `((...))` 就认为是 Logseq 引用。它误伤了一段 Shell 算术：

```bash
num=$((last_num+i))
```

迁移结果里，这一行一度只剩下 `num=$`。常规的“没有残留 block ref”检查反而会认为结果正确，因为该字符串确实被删掉了。

问题是在全量逐字重算时暴露的。我把规则收紧为只匹配符合 Logseq ID 形态的十六进制连字符标识，并增加了 Shell 算术回归测试。随后用修正后的转换器重新计算全部 609 个 Markdown 文件，与已生成文件逐字比较。

这件事提醒我，删除类转换不能只检查“目标字符串是否消失”，还要检查周围内容有没有被误删。

### Unicode 文件名会改变路径指纹

第二个问题出现在迁移分支合并回主分支之后。文件内容、数量和字节数都没变，但 raw archive 的 aggregate hash 变了。

逐文件比较后发现，差异来自少量文件名。源文件使用 Unicode NFD 表示带变音符号的字符，Git checkout 后变成了 NFC。它们在人眼看来完全相同，文件内容的 SHA-256 也相同，但路径字节不同，所以包含路径的 aggregate hash 会变化。

最终的处理方式不是忽略错误，而是在计算指纹前把相对路径统一规范化为 NFC，并为 NFD/NFC 等价路径增加测试。修正后，源目录和 raw archive 的文件数、字节数、内容及规范化路径指纹再次一致。

## Phase 3：再把笔记放到能用的位置

Phase 2 结束后，旧数据已经安全进入 Obsidian，但它们还不算真正“切换完成”。238 篇 pages 如果长期堆在 Inbox，搜索和链接能用，知识系统却仍然处在临时状态。

这一步最容易出问题。分类不是简单按标题分目录，也不能让多个执行者各自凭感觉判断。之前尝试过的旧分类结果已经出现概念漂移：有些页面因为链接多被当成 MOC，有些项目材料被拆成普通资源，有些外部资料又被误认为个人笔记。于是我重新从主分支开始审计。

这轮分类采用了一个更稳的流程：

1. 将 238 篇导入页按 UTF-8 字节稳定排序，切成互不重叠的只读批次；
2. 多个阅读任务分别阅读全文，记录建议目录、依据、置信度和风险；
3. 另做一轮链接、附件和项目簇审计，避免只看局部文本；
4. 所有建议只作为证据，最终目录由同一个主判断口径统一裁决；
5. 先生成完整清单，确认后再进入实际移动。

最后形成的目录分布是：

| 目标目录 | 数量 |
|---|---:|
| 00-Inbox | 43 |
| 10-Notes | 65 |
| 20-Projects | 51 |
| 30-Areas | 1 |
| 40-Resources | 75 |
| 50-MOCs | 3 |
| 合计 | 238 |

这里的关键不是“分类看起来合理”，而是分类清单本身可对账：238 篇没有重复、没有遗漏，每个文件都有明确目标。执行阶段不得重新分类，只能按已确认清单移动文件。

## 结构迁移也要可验证

正式移动前，我又为分类结果生成了一份内容基线。基线记录 238 篇页面的规范化内容 SHA-256，以及分类清单本身的 SHA-256。后续每批执行前都要确认清单没有漂移，执行后再确认内容没有被改写。

Phase 3 的实际写入拆成 10 个批次：

- 1 个 Area 批次；
- 2 个 Notes 批次；
- 3 个 Resources 批次；
- 3 个 Projects 批次；
- 1 个 MOCs 批次。

这 10 个批次一共移动 195 篇，保留 43 篇在 Inbox。唯一允许的正文差异，是移动后把附件相对路径从旧深度改为新深度。除此之外，不改 frontmatter，不合并页面，不重命名文件，不改 Wikilink 文本。

最终验证结果是：

| 检查项 | 结果 |
|---|---:|
| 分类测试 | 58 项通过 |
| 已移动 pages | 195 |
| 保留 Inbox pages | 43 |
| 内容不一致 | 0 |
| 本地附件缺失 | 0 |
| 位置错误 | 0 |
| 移动后附件路径重写 | 147 处 |

最后还做了一轮 Obsidian 抽样检查：不同目标目录下的页面可以正常打开，Properties 能识别，内部链接能跳转，本地附件能进入渲染 DOM。这个验证不追求覆盖全部页面，它的作用是补上脚本无法证明的那一层：真实 Obsidian 里能不能用。

## 验证不是最后一步

我没有等到所有文件迁完才统一检查。每个批次都执行同一套流程：

1. dry-run，确认输入数量和目标冲突；
2. 执行迁移；
3. 运行转换或分类测试；
4. 校验当前累计文件数和附件链接；
5. 写短报告；
6. 只暂存当前批次允许变更的文件；
7. 提交 Git。

Phase 2 最终验收结果是：

| 检查项 | 结果 |
|---|---:|
| 自动测试 | 10 项通过 |
| Markdown 逐字重算比较 | 609 个一致 |
| Assets 哈希比较 | 210 个一致 |
| Journals 输出 | 371 个 |
| Pages 输出 | 238 个 |
| 目标冲突 | 0 |
| 失效附件链接 | 0 |
| 验证错误 | 0 |

Phase 3 最终验收则证明，所有导入页已经按确认清单进入新结构，且内容没有被分类过程顺手改坏。

## 闭环：给当前 Vault 固定最终状态

Phase 3 的内容基线有一个很明确的作用：证明分类移动本身没有改写页面。后来我又做了一轮更适合 Obsidian 的轻量整理，比如 frontmatter 去掉多余引号、把部分 Logseq 标签整理成 Obsidian 更容易识别的形式。这些改动不是迁移丢失，也不是分类移动错误，但它们会让 Phase 3 当时的内容 SHA-256 不再代表当前 master。

如果继续让默认验证只看旧基线，仓库会长期处在一个尴尬状态：历史迁移是成功的，当前验证却会报内容漂移。既然后面不会再有新的 Logseq 数据迁入，我把这个问题在迁移层闭环处理掉：

- 保留 `80-Archive/logseq-migration/reports/classification-content-baseline-v2.json`，作为 Batch 025 的历史迁移证据；
- 新增 `80-Archive/logseq-migration/reports/classification-final-state-baseline-v2.json`，记录当前 master 在迁移收尾时的最终内容指纹；
- 保留 `baseline`、`batch`、`report` 对旧迁移基线的默认使用；
- 把 `verify` 明确限定为迁移档案的手动验收命令，而不是日常写作 gate；
- 新增 Batch 026 报告，明确迁移已经关闭，不再等待后续批次。

闭环时还修掉了两个迁移尾巴。第一，`80-Archive/logseq-raw` 在后续整理中被误纳入过一轮标签和双链规范化，我把它恢复到脱敏后的归档版本。raw archive 的职责是留作输入快照，不应该随着 Obsidian 使用习惯继续变化。第二，两个脱敏账户页的 HTML 脱敏注释原本放在 frontmatter 前面，导致 Obsidian Properties 和迁移校验都无法识别 metadata。我把注释移到 frontmatter 之后，既保留脱敏说明，也恢复了 metadata 可解析性。

恢复 raw archive 后，少量历史文件里的尾随空格也会回到 diff 里。这不是我要再清理的对象：对 raw archive 来说，字节稳定性比 Markdown 风格更重要。它也不应该进入日常写作检查；只有回看迁移档案时，才需要单独处理这类历史输入。

闭环后的当前验证结果是：

| 检查项 | 结果 |
|---|---:|
| 清单内 pages | 238 |
| 保留 Inbox pages | 43 |
| 已移动 pages | 195 |
| 内容不一致 | 0 |
| 本地附件缺失 | 0 |
| 位置错误 | 0 |
| 附件页面 | 51 |
| 附件链接 | 150 |

这一步没有覆盖历史证据，而是把“迁移时没改坏内容”和“当前 Vault 已经闭环可验证”分成两份基线。前者用于追溯，后者用于日常健康检查。

后续仓库清理又新增了一步：`80-Archive/logseq-raw` 不再随当前 `master` 保留，迁移材料统一归档到 `80-Archive/logseq-migration/`。这不改变已经迁入 Obsidian 的正式笔记和附件，只是让支持库不再直接携带原始 Logseq 文件。
