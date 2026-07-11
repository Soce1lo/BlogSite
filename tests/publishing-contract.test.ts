import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import { PUBLISH_CONTRACT_VERSION } from "../scripts/contracts/publishing-v1";
import { evaluatePublishCandidate } from "../scripts/utils/vault-index";
import { OUTPUT_KINDS } from "../src/lib/output-kind";

const contractRoot = path.join(process.cwd(), "contracts", "publishing", "v1");

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
