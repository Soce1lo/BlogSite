import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { PUBLISH_CONTRACT_VERSION } from "../scripts/contracts/publishing-v1";
import {
  toPublishedFrontmatter,
  type VaultDocument,
} from "../scripts/utils/frontmatter";
import { evaluatePublishCandidate } from "../scripts/utils/vault-index";
import { OUTPUT_KINDS } from "../src/lib/output-kind";

const contractRoot = path.join(process.cwd(), "contracts", "publishing", "v1");

function makeDocument(
  publishTarget: "blog" | "notes" | "projects",
  overrides: Record<string, unknown> = {},
): VaultDocument {
  return {
    absolutePath: `/synthetic/${publishTarget}.md`,
    sourceVaultPath: `60-Publish/Contract Examples/${publishTarget}.md`,
    data: {
      title: `${publishTarget} title`,
      description: `${publishTarget} description`,
      created: "2026-07-11",
      publish_target: publishTarget,
      publish_status: "published",
      publish_slug: `${publishTarget}-entry`,
      publish_visibility: "public",
      publish_date: "2026-07-11",
      ...overrides,
    },
    content: "Synthetic content.",
  };
}

test("V1 schema 与当前发布候选枚举保持一致", async () => {
  const schema = JSON.parse(
    await readFile(path.join(contractRoot, "schema.json"), "utf8"),
  );

  assert.equal(schema["x-contract-version"], PUBLISH_CONTRACT_VERSION);
  assert.deepEqual(schema["x-source-layout"], {
    nested_source_paths: true,
    source_path_is_management_only: true,
    route_identity: "publish_slug",
    series_fields: ["publish_series", "publish_series_order"],
  });
  assert.deepEqual(schema["x-authoring-required-by-publish-status"], {
    draft: [],
    published: ["publish_date"],
  });
  assert.deepEqual(schema.required, [
    "title",
    "description",
    "created",
    "publish_target",
    "publish_status",
    "publish_slug",
    "publish_visibility",
  ]);
  assert.deepEqual(schema.properties.publish_target.enum, ["blog", "notes", "projects"]);
  assert.deepEqual(schema.properties.publish_status.enum, ["draft", "published"]);
  assert.deepEqual(schema.properties.publish_visibility.enum, ["public", "unlisted"]);
  assert.deepEqual(schema.properties.publish_kind.enum, [...OUTPUT_KINDS]);
  assert.deepEqual(schema.properties.publish_date.type, ["string", "number"]);
  assert.equal(schema.properties.publish_series_order.type, "number");
  assert.deepEqual(schema.dependentRequired.publish_series_order, ["publish_series"]);
});

test("V1 缺省输出语义和分类由当前适配器稳定生成", () => {
  const expectedKinds = {
    blog: "thought",
    notes: "learned",
    projects: "built",
  } as const;

  for (const publishTarget of ["blog", "notes", "projects"] as const) {
    const document = makeDocument(publishTarget);
    const evaluation = evaluatePublishCandidate(document);
    assert.ok(evaluation.entry);
    assert.equal(evaluation.entry.outputKind, expectedKinds[publishTarget]);
    assert.equal(evaluation.entry.publishedDate, "2026-07-11");
    const frontmatter = toPublishedFrontmatter(document, evaluation.entry);
    assert.equal(frontmatter.pubDate, "2026-07-11");
    assert.equal(frontmatter.category, "未分类");
  }
});

test("V1 使用显式首次发布日期并为旧内容回退到 created", () => {
  const explicit = makeDocument("blog", {
    created: "2026-07-01",
    publish_date: "2026-07-11",
  });
  const explicitEvaluation = evaluatePublishCandidate(explicit);
  assert.ok(explicitEvaluation.entry);
  assert.equal(explicitEvaluation.entry.publishedDate, "2026-07-11");
  assert.equal(
    toPublishedFrontmatter(explicit, explicitEvaluation.entry).pubDate,
    "2026-07-11",
  );

  const legacy = makeDocument("notes", { created: "2026-07-02" });
  delete legacy.data.publish_date;
  const legacyEvaluation = evaluatePublishCandidate(legacy);
  assert.ok(legacyEvaluation.entry);
  assert.equal(legacyEvaluation.entry.publishedDate, "2026-07-02");
});

test("V1 草稿可以省略首次发布日期", () => {
  const draft = makeDocument("notes", { publish_status: "draft" });
  delete draft.data.publish_date;

  const evaluation = evaluatePublishCandidate(draft);
  assert.ok(evaluation.entry);
  assert.equal(evaluation.entry.publishStatus, "draft");
  assert.equal(evaluation.entry.publishedDate, "2026-07-11");
});

test("V1 拒绝无效或早于创建日的首次发布日期", () => {
  assert.deepEqual(
    evaluatePublishCandidate(makeDocument("blog", { publish_date: "not-a-date" })),
    { reason: "invalid-publish-date" },
  );
  assert.deepEqual(
    evaluatePublishCandidate(
      makeDocument("blog", {
        created: "2026-07-11",
        publish_date: "2026-07-10",
      }),
    ),
    { reason: "invalid-publish-date" },
  );
});

test("V1 拒绝不符合 schema 的 publish_series_order", () => {
  const invalidDocuments = [
    makeDocument("blog", {
      publish_series: "Series",
      publish_series_order: "2",
    }),
    makeDocument("blog", {
      publish_series: "Series",
      publish_series_order: Number.POSITIVE_INFINITY,
    }),
    makeDocument("blog", { publish_series_order: 2 }),
  ];

  for (const document of invalidDocuments) {
    assert.deepEqual(evaluatePublishCandidate(document), {
      reason: "invalid-series-order",
    });
  }
});

test("V1 保留带 series 的有效数值顺序", () => {
  const evaluation = evaluatePublishCandidate(
    makeDocument("blog", {
      publish_series: "Series",
      publish_series_order: 2,
    }),
  );

  assert.ok(evaluation.entry);
  assert.equal(evaluation.entry.series, "Series");
  assert.equal(evaluation.entry.seriesOrder, 2);
});

test("V1 接受嵌套管理文件夹中的源稿且不把文件夹带入站点路由", () => {
  const nestedDocument = {
    ...makeDocument("blog"),
    sourceVaultPath: "60-Publish/KnowledgeVault 实践/nested-entry.md",
  };

  const evaluation = evaluatePublishCandidate(nestedDocument);

  assert.ok(evaluation.entry);
  assert.equal(evaluation.entry.sourceVaultPath, nestedDocument.sourceVaultPath);
  assert.equal(evaluation.entry.url, "/blog/blog-entry/");
});

for (const exampleName of ["published-blog.md", "draft-note.md"]) {
  test(`V1 example ${exampleName} 可被当前候选解析器接受`, async () => {
    const absolutePath = path.join(contractRoot, "examples", exampleName);
    const parsed = matter(await readFile(absolutePath, "utf8"));
    const evaluation = evaluatePublishCandidate({
      absolutePath,
      sourceVaultPath: `60-Publish/Contract Examples/${exampleName}`,
      data: parsed.data as Record<string, unknown>,
      content: parsed.content,
    });

    assert.ok(evaluation.entry);
    assert.equal(evaluation.entry.publishTarget, parsed.data.publish_target);
    assert.equal(evaluation.entry.publishStatus, parsed.data.publish_status);
    assert.equal(evaluation.entry.visibility, parsed.data.publish_visibility);
  });
}
