---
title: DeepSeek Harness：编程工具之外
description: 从执行轨迹出发，讨论可观测性、能力组合与跨角色复用，以及我为什么更看好这种演进方向。
pubDate: '2026-11-17'
updatedDate: '2026-11-17'
draft: false
category: AI 工程实践
tags:
  - AI
  - Agent
  - 软件工程
visibility: public
sourceVaultPath: 60-Publish/Blog/AI工程实践/从OpenCode到DeepSeek-Harness-Agent框架演进.md
managedBy: vault-sync
sourcePublishStatus: published
outputKind: thought
---
# DeepSeek Harness：编程工具之外

*从一次使用体验，谈我对 Agent 演化方向的理解*

## 一次开发对话带来的兴趣

我平时主要用 OpenCode 辅助开发。使用过程很自然：告诉模型我要做什么，它去读代码、调用工具、修改文件，我看完结果，再补充要求或纠正理解。几轮下来，一项工作逐渐完成。这个过程中，我既关心结果，也会留意每次交互花了多久、用了多少 token，以及它究竟做了哪些事。

DeepSeek Harness（下文简称 DSH）最先吸引我的，就是它的[轨迹视图](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-trajectory/README.md)。同样是一次开发对话，在我的体验里，它把每轮交互和工具调用呈现得比我原先使用 OpenCode 时更清楚。时间、用量、输入输出，可以沿着执行记录展开查看。我不必只盯着最后一条回复，也能顺着过程理解这次工作是怎样完成的。

但真正让我想继续研究 DSH 的，是这个体验背后的问题：我们习惯把这类工具叫作“编程 Agent”，可刚才这一整套过程——提出目标、获取材料、调用工具、根据反馈继续行动——究竟有多少部分必须属于编程？如果换成处理一批表格，或者根据材料写一份报告，这套工作方式还成立吗？

## 当编程只是工作的一部分

我是通过编程接触和理解这类工具的。Claude Code、OpenCode 这样的产品，让我熟悉了模型在环境中执行任务的方式。编程确实是一个很适合的入口：材料是文件，操作能通过工具完成，编译和测试又能给出明确反馈。沿着这个入口，模型可以从“告诉我怎么做”，走到实际参与完成工作。

可我的工作不会总按工具的分类结束。分析完代码，可能还要统计数据；发现一个问题，需要整理材料解释给别人；形成了结论，又要写报告或者做 PPT。这些环节在软件里属于不同功能，在做事的人眼里却是一项工作的延续。如果每换一种产出，都要重新交代背景、搬运材料，前一个环节积累下来的理解就很难顺畅地带到后面。

这种延续也发生在工作之外。早在接触 DSH 之前，我就已经在用这类编程 Agent 探索个人知识系统：让模型结合已有笔记，帮助我回看思考、发现联系，再把值得保留的理解逐渐写下来。这件事我已经探索了很久，也一直在实践，博客里的 [KnowledgeVault 实践系列](../obsidian-personal-knowledge-management-skill/) 记录的就是这个过程。我还专门写过 [知识系统如何与 Agent 协作](../obsidian-knowledge-system-skill-operating-guide/)。它所服务的已经是我的学习、思考和表达，哪些内容真正成为自己的知识，仍然由我判断。

从这些实际使用出发，我认为，Agent 接下来会越来越多地承接这种连续的工作。编程仍然重要，但数据处理、表格、写作和展示，也会进入同一套执行环境。真正值得关注的，是它能不能带着已有的材料和任务背景继续做事。把几个入口放进同一个界面只是其中一步，底下的能力怎样连接，才决定这种连续性能够走多远。

顺着这个方向想，我更关心底层该怎样组织。编程、数据分析、报告生成各有特点，但它们也会用到一些相同的能力。如果这些能力可以拆开、复用，再根据任务重新组合，那么增加一种工作方式，就不一定要从头再做一套工具。我更看好的是这样的扩展方式。

## 为什么我看重能力的组合

插件化吸引我的地方，首先是它允许我们按需要组织能力。不过，把功能拆成插件只是开始：它依赖哪些其他能力？换掉其中一个，会影响哪些部分？卸载之后，留下的事件监听和资源由谁清理？这些问题处理得好，插件才能真正组合起来，工具也才有机会在变化中继续扩展。

DSH 底层的 Cordis，正是在处理这些问题。它的[论文](https://arxiv.org/abs/2608.25512)把动态组合分成两个方面：组件之间的依赖如何管理，以及组件移除时如何撤销它在框架中注册的影响。落到使用上，就是让能力能够按依赖关系接入，也能在退出时清理相应注册和资源。这让我觉得“一切皆插件”有了更扎实的含义：框架需要为能力的组合与替换提供保障。

Pi 和 DSH 都给使用者留下了扩展工具形态的空间，但做法有所不同。Pi 从精简的主体出发，[通过扩展接入工具、事件处理和界面](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)；DSH 则把[更多运行时组件也纳入插件体系](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)，包括模型适配、工具注册、会话记录和 agent 循环。相比之下，我更欣赏 DSH 把组合深入到这些基础部分的尝试：构建者能够调整的，不只是增加哪些功能，还包括这些功能怎样参与执行。

沿着这个设计，就可以先确定一种工作需要什么能力，再[选择插件组合](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)，并控制当前 agent 能看到哪些工具。编程时提供代码与测试工具，数据分析时提供读取、计算和绘图工具，需要汇报时再接入文档与演示能力。这是我期待的组织方式：同一套基础可以形成不同的工作模式，模型每次面对的也可以只是当前任务需要的能力。

有了这些能力，接下来还要决定怎样把它们用起来。DSH 已有的 [PTC，也就是程序化工具调用](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/tool-executor-ptc/README.md)，正好提供了一个例子。假设我要根据几份表格做汇报，模型可以先写一段程序，调用已暴露的工具读取数据，在程序里完成筛选、计算和合并，再把汇总与异常交给模型解释。之后，它还可以使用相应工具生成图表和演示文件。插件提供可用能力，程序把这些工具组织成具体的执行步骤。

我认为这也是一种有机会省 token 的方式。逐条读取、循环处理和固定规则的计算，可以留在程序里；需要理解和判断的结果，再交给模型。这样既能减少中间材料进入上下文，也能减少机械步骤中的模型往返。当然，生成代码和工具说明也有成本，程序出错还要重试，实际收益取决于任务。但我认可这种分工：明确的规则交给程序，把模型用在更需要判断的地方。[PTC 的 token 成本说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/tool-executor-ptc/README.md#model-experience)

再往前一步，如果某种组合反复有用，就可以把经过验证的程序和输入输出约定保存下来，逐渐做成可维护的工作流。这是我希望在实践中继续做的事，PTC 本身不会自动完成这一步。对我来说，插件化的价值也在这里变得具体：先把能力接进来，按工作需要选择，再用程序组织执行，把成熟的做法留下来。同一套基础，才有机会服务于不同的人和不同的工作。

## 这种变化已经在发生

把几款工具的变化放在一起看，这个方向就更具体了。[Claude Code](https://www.anthropic.com/news/claude-3-7-sonnet) 展示的是一个重要起点：开发者在终端提出要求，agent 进入项目、操作文件、调用工具，把编程任务推进下去。它也成了 OpenCode 创作者 [Dax Raad](https://www.baseten.co/blog/building-ai-agents-open-code-and-open-source-a-conversation-with-dax/) 的参照——让他产生兴趣的，正是模型能够直接在工作环境里做事。

OpenCode 接着把这种工作方式开放给更多模型和社区参与者。Dax 在[访谈](https://www.baseten.co/blog/building-ai-agents-open-code-and-open-source-a-conversation-with-dax/)中说，团队希望做一个开源版的 Claude Code，进一步发挥终端能力，并支持不同模型；社区则能补充团队自己覆盖不到的模型经验。对我来说，这一步的意义在于：使用者能够参与改变工具，围绕同一个基础尝试不同能力和做法。

OpenAI 的产品变化，进一步把编程与其他工作放到了同一个环境里。[Codex 推出云端 agent](https://openai.com/index/introducing-codex/) 时，主要面向软件工程；如今的 ChatGPT 桌面应用已经同时提供 [Chat、Work 和 Codex](https://learn.chatgpt.com/docs/use-chatgpt)，分别承接交流、研究与交付件、软件开发。官方也明确说明，Codex 可以用于文档和演示等知识工作。

这正好回应了前面的问题：写完代码之后，还有数据要分析、材料要整理、结果要表达。同一个人的工作是连续的，产品也开始把这些事情放在一起承接。在我看来，这是 Agent 从编程工具走向更广工作环境的一个鲜明信号。不同入口仍有各自的界面和会话组织，而 Codex 能够处理文档和演示这件事本身，就让我看到编程 Agent 的能力可以延伸到更多任务。

OpenCode 也在继续变化。我用 V2 时，印象比较深的是多会话页面和工具发现。早期版本已经有标签页和近期会话管理，V2 又加入跨服务器的近期会话视图，以及收件箱、已读未读等状态组织；工具侧把可调用的能力组织为目录，通过 Code Mode 用程序组合调用，并在 MCP 工具变化时增量通知模型。它依然专注编程，但从我的体验看，工作台需要管理的已经是多项并行工作，以及不断变化的能力集合。

这条演进线上还有一件我觉得很有意思的事：Oh My OpenCode 后来改名为 Oh My OpenAgent，又发展出基于 Pi 分支 Senpi 的 [OmO Native](https://github.com/code-yeongyu/oh-my-openagent)。做出这个选择的是 OmO 的维护者。它原本依托 OpenCode 扩展能力，后来却需要更独立地掌握自己的运行方式。[项目路线图](https://github.com/code-yeongyu/oh-my-openagent/blob/dev/ROADMAP.md)解释了其中的困难：插件与宿主主循环的交互可能引发重复执行和状态问题，频繁的接口变化也带来成本，因此希望把核心从单一宿主中抽离。

到了 V2 兼容受阻时，OmO 维护者推荐使用 Native，后来的适配入口也先承担了迁往 Native 的指引；完整的双宿主支持仍在讨论。这个选择让我看到，开源生态中的扩展也会长出自己的方向：当它开始决定任务如何调度、工具如何协作，宿主留出的空间就变得关键。我关心的插件化抽象，也正是在这里接受考验——它究竟能支持一个功能附着上去，还是能让一种新的工作方式生长出来？

## 为什么我更偏向 DSH

我更偏向 DSH，首先因为它让执行过程更容易被理解。轨迹视图将请求、工具调用与资源消耗联系起来，使我能够检查结果是怎样形成的、代价发生在哪里。对于需要连续委托任务的工具，这种可观测性提供了判断和改进的依据：只有能区分必要的执行与无效的尝试，使用经验才有机会积累为可复用的方法。

知识库实践则让我进一步看到，编程、学习和表达虽然有不同的产出，却共享读取材料、组织信息、调用工具和验证结果等能力。框架如何划分这些能力，决定了它们能否跨任务复用。DSH 将能力纳入插件体系，再通过组合适应不同工作，吸引我的正是这一点。专门的办公或开发入口可以保留各自的体验，底层则可以共用一套能力结构。我所追求的统一，落在这些能力及其协作方式上。

从编程走向更广的工作，意味着框架会不断遇到最初没有预设的任务。此时，一套抽象的价值，要看它能否让新能力接入、让已有能力重新组合，同时保持执行过程可理解。DSH 的设计更接近我的这一期待，因此值得我继续投入实践。我想用知识库和其他真实任务检验：它能否在容纳更多工作方式的同时，仍然保持组合的清晰与维护的可控。这也是我判断这条路线能走多远的依据。

## 参考资料

- OpenCode V2：[桌面更新记录](https://opencode.ai/changelog?area=desktop)
- OpenCode V2：[工具与 Code Mode](https://opencode.ai/docs/tools)
- OpenCode V2：[开发记录](https://github.com/anomalyco/opencode/blob/dev/CHANGELOG.md)
- OmO 与 OpenCode V2：[Native 使用建议](https://github.com/code-yeongyu/oh-my-openagent/issues/7847)
- OmO 与 OpenCode V2：[V2 适配入口](https://github.com/code-yeongyu/oh-my-openagent/pull/10439)
- OmO 与 OpenCode V2：[双宿主讨论](https://github.com/code-yeongyu/oh-my-openagent/issues/9389)
