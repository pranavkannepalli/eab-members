// Chunking test for lib/resend.ts with a fake fetch (no network, no key). Run: npm run test:resend
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunk, sendEach, RESEND_BATCH_MAX } from "../lib/resend.ts";

const emails = (n: number) => Array.from({ length: n }, (_, i) => `m${i}@example.com`);

test("chunk splits into groups of at most the batch max", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 100), []);
  assert.deepEqual(chunk(emails(250)).map((c) => c.length), [100, 100, 50]);
  assert.deepEqual(chunk(emails(100)).map((c) => c.length), [100]);
  assert.throws(() => chunk([1], 0));
});

test("sendEach makes one batch call per chunk, one recipient per email", async () => {
  const calls: any[][] = [];
  const fake = (async (_url: string, init: RequestInit) => {
    const batch = JSON.parse(String(init.body));
    calls.push(batch);
    return new Response(JSON.stringify({ data: batch.map((_: unknown, i: number) => ({ id: `id-${calls.length}-${i}` })) }), { status: 200 });
  }) as typeof fetch;
  const to = emails(230);
  const res = await sendEach(to, { subject: "Hi", text: "Body" }, { apiKey: "k", from: "a@b.c", fetch: fake, pauseMs: 0 });
  assert.deepEqual(calls.map((c) => c.length), [100, 100, 30]);
  assert.ok(calls.every((c) => c.length <= RESEND_BATCH_MAX));
  assert.ok(calls.flat().every((e) => e.to.length === 1 && e.from === "a@b.c" && e.subject === "Hi"));
  assert.deepEqual(calls.flat().map((e) => e.to[0]), to); // every address exactly once, in order
  assert.equal(res.filter((r) => r.ok).length, 230);
});

test("a failed batch call fails only its own chunk", async () => {
  let n = 0;
  const fake = (async (_u: string, init: RequestInit) => {
    const batch = JSON.parse(String(init.body));
    return ++n === 2 ? new Response(JSON.stringify({ message: "boom" }), { status: 422 })
      : new Response(JSON.stringify({ data: batch.map(() => ({ id: "x" })) }), { status: 200 });
  }) as typeof fetch;
  const res = await sendEach(emails(5), { subject: "s", text: "t" }, { apiKey: "k", from: "f", fetch: fake, pauseMs: 0, size: 2 });
  assert.deepEqual(res.map((r) => r.ok), [true, true, false, false, true]);
  assert.equal(res[2].error, "Resend 422: boom");
});
