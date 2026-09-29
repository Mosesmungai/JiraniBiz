import assert from "node:assert/strict";
import test from "node:test";
import { classifyExistingDocuments } from "../scripts/firestore-import-core.mjs";

test("classifies identical Firestore documents as already imported", () => {
  const items = [{ collection: "businesses", id: "biz-1", data: { name: "A", createdAt: "2025-01-01" } }];
  const result = classifyExistingDocuments(items, [
    { collection: "businesses", id: "biz-1", data: { createdAt: "2025-01-01", name: "A" } },
  ]);

  assert.deepEqual([...result.existing], ["businesses/biz-1"]);
  assert.deepEqual(result.conflicts, []);
});

test("reports differing Firestore documents without classifying them for overwrite", () => {
  const items = [{ collection: "businesses", id: "biz-1", data: { name: "SQLite version" } }];
  const result = classifyExistingDocuments(items, [
    { collection: "businesses", id: "biz-1", data: { name: "Firestore version" } },
  ]);

  assert.deepEqual([...result.existing], []);
  assert.deepEqual(result.conflicts, ["businesses/biz-1"]);
});
