import { test } from "node:test";
import assert from "node:assert/strict";
import { search, next, suggest } from "../src/api/mockServer.js";

test("continuation pagination walks every page and ends with null", async () => {
  let page = await search("야구");
  const ids = page.items.map((i) => i.id);
  assert.equal(page.items[3].type, "shorts_shelf");
  while (page.continuation) {
    page = await next(page.continuation);
    ids.push(...page.items.map((i) => i.id));
  }
  assert.equal(new Set(ids).size, ids.length, "no duplicate items across pages");
  assert.equal(ids.filter((id) => id.startsWith("v")).length, 32);
});

test("suggest returns nothing for blank input", async () => {
  assert.deepEqual(await suggest("  "), []);
  assert.ok((await suggest("야구")).every((s) => s.startsWith("야구 ")));
});
