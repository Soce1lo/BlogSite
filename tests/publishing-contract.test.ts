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
    sourceVaultPath: `60-Publish/${publishTarget}.md`,
    data: {
      title: `${publishTarget} title`,
      description: `${publishTarget} description`,
      created: "2026-07-11",
      publish_target: publishTarget,
      publish_status: "published",
      publish_slug: `${publishTarget}-entry`,
      publish_visibility: "public",
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
    assert.equal(toPublishedFrontmatter(document, evaluation.entry).category, "未分类");
  }
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

for (const exampleName of ["published-blog.md", "draft-note.md"]) {
  test(`V1 example ${exampleName} 可被当前候选解析器接受`, async () => {
    const absolutePath = path.join(contractRoot, "examples", exampleName);
    const parsed = matter(await readFile(absolutePath, "utf8"));
    const evaluation = evaluatePublishCandidate({
      absolutePath,
      sourceVaultPath: `60-Publish/${exampleName}`,
      data: parsed.data as Record<string, unknown>,
      content: parsed.content,
    });

    assert.ok(evaluation.entry);
    assert.equal(evaluation.entry.publishTarget, parsed.data.publish_target);
    assert.equal(evaluation.entry.publishStatus, parsed.data.publish_status);
    assert.equal(evaluation.entry.visibility, parsed.data.publish_visibility);
  });
}
