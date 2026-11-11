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
  eyebrow: "SOCE1LO / PERSONAL LAB",
  title: "把好奇心，变成可验证的理解。",
  description:
    "我是一名研究型工程师。在代码、知识与日常系统之间，把问题拆开，用实践验证，再把值得留下的理解写在这里。",
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
    {
      id: "engineering-practice",
      label: "工程实践",
      description: "从通信协议到 C 编程，让理解接受代码与实践的检验。",
      topics: ["I2C", "SPI", "C", "Algorithms", "Design Patterns"],
    },
    {
      id: "home-lab",
      label: "家庭实验室",
      description: "在家庭网络与影音系统里，探索便利、可靠与边界。",
      series: ["Home Lab"],
      topics: ["家庭网络", "家庭影音自动化"],
    },
    {
      id: "investment-research",
      label: "投资",
      description: "从基础理解、日线研究到可复核的判断与复盘。",
      series: [],
      topics: ["投资"],
      tags: ["investment-research"],
    },
  ],
  featured: [
    { collection: "blog", id: "obsidian-personal-knowledge-management-skill" },
    { collection: "blog", id: "llm-wiki-derived-layer" },
    { collection: "blog", id: "obsidian-local-markdown-knowledge-vault" },
  ],
} as const satisfies SiteProfile;
