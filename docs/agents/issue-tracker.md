# GitHub Issues

BlogSite 的工单和规格都放在 `Soce1lo/BlogSite` 的 GitHub Issues。使用 `gh` 操作。每次会话首次创建工单前，用 `gh repo view --json nameWithOwner` 核对目标。目标有出入时，先向用户确认。

## 工单操作

| 操作 | 命令 |
| --- | --- |
| 发布工单或规格 | `gh issue create --title "<标题>" --body-file <正文文件>` |
| 读取工单和讨论 | `gh issue view <编号> --json number,title,body,labels,state,comments` |
| 列出待分流工单 | `gh issue list --state open --label needs-triage` |
| 添加或移除标签 | `gh issue edit <编号> --add-label <标签>` 或 `--remove-label <标签>` |
| 说明并关闭工单 | 先用 `gh issue comment <编号> --body-file <说明文件>` 留下决定，再用 `gh issue close <编号>` 关闭 |

## 父子关系与阻塞

- 将已有工单挂到父项下，使用 `gh issue edit <父项编号> --add-sub-issue <子项编号>`。若无法使用原生子工单，在子项正文首行写 `Part of #<父项编号>`，并在父项任务列表中引用子项。
- 若 A 必须等 B 完成，在 A 上执行 `gh issue edit <A> --add-blocked-by <B>`。若无法使用原生依赖，在 A 的正文首行写 `Blocked by: #<B>`。
- 用 `gh api repos/Soce1lo/BlogSite/issues/<编号> --jq .issue_dependencies_summary.blocked_by` 查询仍开放的原生阻塞项数量。使用正文记录依赖时，逐项检查引用工单的状态。

**PRs as a request surface: no.**

## Wayfinding operations

`wayfinder` 用带 `wayfinder:map` 标签的工单保存地图，用子工单记录待解决的问题。子工单按类型使用 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling` 或 `wayfinder:task`。

按地图顺序选择首个仍开放、无人认领且没有开放阻塞项的子工单。用 `gh issue edit <编号> --add-assignee @me` 认领。解决后在子工单评论中记录答案，关闭子工单，再把结论摘要和链接补到地图的 `Decisions-so-far`。
