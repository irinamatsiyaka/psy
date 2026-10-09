import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCorsOrigins } from "./cors";

test("normalizes bare Vercel hostnames to HTTPS", () => {
  assert.deepEqual(normalizeCorsOrigins("psy-frontend-gfiv.vercel.app"), [
    "https://psy-frontend-gfiv.vercel.app"
  ]);
});

test("supports comma separated origins and localhost", () => {
  assert.deepEqual(normalizeCorsOrigins("https://app.example.com, localhost:5173"), [
    "https://app.example.com",
    "http://localhost:5173"
  ]);
});
