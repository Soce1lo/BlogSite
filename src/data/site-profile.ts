import type { PublicEntryRef, ThreadDefinition } from "../lib/output";

export interface SiteProfile {
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  now: {
    label: string;
    text: string;
    updated: string;
  };
  boundary: string;
  threads: readonly ThreadDefinition[];
  featured: readonly PublicEntryRef[];
}

export const siteProfile = {
  name: "Soce1lo",
  eyebrow: "SOCE1LO / GROWTH OUTPUT LOG",
  title: "记录我如何理解、学习与构建。",
  description:
    "这里是我的知识管道的公开输出端。我把经历中的思考、学到的技术和做过的项目，整理成可复用、可追踪的长期记录。",
  now: {
    label: "NOW / 当前关注",
    text: "正在把个人知识系统整理成可持续的成长输出管道。",
    updated: "2026-07-10",
  },
  boundary: "输入留在私人系统，输出经过选择后公开。",
  threads: [
    {
      id: "knowledge-systems",
      label: "知识系统",
      description: "本地知识、迁移、Agent 派生层与公开发布。",
      series: ["KnowledgeVault 实践"],
      topics: ["Obsidian", "LLM Wiki"],
      tags: ["knowledge-management"],
    },
  ],
  featured: [
    { collection: "blog", id: "logseq-to-obsidian-migration" },
    { collection: "blog", id: "llm-wiki-derived-layer" },
    { collection: "blog", id: "obsidian-local-markdown-knowledge-vault" },
  ],
} as const satisfies SiteProfile;
