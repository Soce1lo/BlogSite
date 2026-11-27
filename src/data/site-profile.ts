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
  mapThreadIds: readonly string[];
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
      id: "technical-practice",
      label: "职业实践",
      description: "从真实的嵌入式问题出发，记录配置、验证和故障定位中的判断。",
      series: ["技术实践"],
    },
    {
      id: "engineering-practice",
      label: "工程能力",
      description: "从 C 编程、通信协议到排障和嵌入式实验，用代码与实验检验理解。",
      topics: ["I2C", "SPI", "C", "Algorithms", "Design Patterns", "嵌入式与系统实验", "macOS 排障"],
    },
    {
      id: "investment-research",
      label: "投资学习",
      description: "从基础理解、日线研究到可复核的判断与复盘。",
      topics: ["投资", "投资学习"],
      tags: ["investment-research"],
    },
    {
      id: "knowledge-systems",
      label: "个人知识系统",
      description: "探索日常记录如何积累、彼此联系，并帮助理解新的问题。",
      series: ["KnowledgeVault 实践"],
      topics: ["Obsidian", "LLM Wiki"],
      tags: ["knowledge-management"],
      readingOrder: [
        { label: "总览", collection: "blog", id: "obsidian-personal-knowledge-management-skill" },
        { label: "现行运行说明", collection: "blog", id: "obsidian-knowledge-system-skill-operating-guide" },
        { label: "任务工具案例", collection: "blog", id: "obsidian-task-management-workflow" },
      ],
    },
    {
      id: "home-lab",
      label: "家庭实验室",
      description: "在家庭网络与影音系统里，探索便利、可靠与边界。",
      series: ["Home Lab"],
      topics: ["家庭网络", "家庭影音自动化"],
    },
  ],
  mapThreadIds: ["technical-practice", "engineering-practice", "investment-research", "knowledge-systems"],
  featured: [
    { collection: "blog", id: "obsidian-personal-knowledge-management-skill" },
    { collection: "notes", id: "mac-heat-clash-wechat-udp-investigation" },
    { collection: "projects", id: "qemu-machine-device-lab" },
  ],
} as const satisfies SiteProfile;
