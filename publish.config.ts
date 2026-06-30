const publishConfig = {
  vaultPath: process.env.BLOGSITE_VAULT_PATH ?? "../KnowledgeVault",
  contentOutputPath:
    process.env.BLOGSITE_CONTENT_OUTPUT_PATH ?? "src/content",
  imageOutputPath: process.env.BLOGSITE_IMAGE_OUTPUT_PATH ?? "public/images",
  reportsPath: process.env.BLOGSITE_REPORTS_PATH ?? "reports",
  defaultLang: "zh-CN",
  collections: {
    blog: "src/content/blog",
    notes: "src/content/notes",
    projects: "src/content/projects",
  },
  routes: {
    blog: "/blog",
    notes: "/notes",
    projects: "/projects",
  },
  excludeVaultDirs: [
    ".git",
    ".obsidian",
    "80-Archive",
    "_system",
    "90-Attachments",
  ],
} as const;

export default publishConfig;
