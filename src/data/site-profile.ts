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
  threads: readonly ThreadDefinition[];
  featured: readonly PublicEntryRef[];
}

export const siteProfile = {
  name: "Soce1lo",
  eyebrow: "SOCE1LO / PERSONAL LAB",
  title: "把好奇心变成可验证的理解。",
  description:
    "从具体的问题出发，追问事物背后的原理，在实践中检验自己的判断。把学习与思考写下来，让零散的经验逐渐连成脉络，也让今天的认识，成为日后继续探索的起点。",
  now: {
    label: "NOW / 当前关注",
    text: "正在把个人知识系统整理成可持续的成长输出管道。",
    updated: "2026-07-10",
  },
  threads: [
    {
      id: "knowledge-systems",
      label: "知识系统",
      description: "探索日常记录如何积累、彼此联系，并帮助理解新的问题。",
      series: ["KnowledgeVault 实践"],
      topics: ["Obsidian", "LLM Wiki"],
      tags: ["knowledge-management"],
      readingOrder: [
        { label: "总览", collection: "blog", id: "obsidian-personal-knowledge-management-skill" },
        { label: "日常运行", collection: "blog", id: "obsidian-knowledge-system-skill-operating-guide" },
        { label: "具体方法", collection: "blog", id: "obsidian-task-management-workflow" },
      ],
    },
    {
      id: "technical-practice",
      label: "技术实践",
      description: "记录真实技术问题中的配置、验证与定位，随实践逐步补齐理解。",
      series: ["技术实践"],
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
    { collection: "notes", id: "mac-heat-clash-wechat-udp-investigation" },
    { collection: "blog", id: "electric-toothbrush-value-first-buying" },
  ],
} as const satisfies SiteProfile;
