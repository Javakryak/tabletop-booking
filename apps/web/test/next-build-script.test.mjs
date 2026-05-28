import assert from "node:assert/strict";
import { test } from "node:test";

import { createNextBuildPlan } from "../scripts/next-build.mjs";

test("uses SWC WASM with webpack when native SWC is not loadable on macOS arm64", () => {
  const plan = createNextBuildPlan({
    arch: "arm64",
    nativeSwcLoadable: false,
    platform: "darwin",
    resolveWasmDirectory: () => "/repo/apps/web/node_modules/@next/swc-wasm-nodejs"
  });

  assert.equal(plan.env.NEXT_TEST_WASM_DIR, "/repo/apps/web/node_modules/@next/swc-wasm-nodejs");
  assert.deepEqual(plan.args, ["build", "--webpack"]);
  assert.equal(plan.usingWasmFallback, true);
});

test("keeps the default Next.js build when native SWC is loadable", () => {
  const plan = createNextBuildPlan({
    arch: "arm64",
    nativeSwcLoadable: true,
    platform: "darwin",
    resolveWasmDirectory: () => {
      throw new Error("WASM directory should not be resolved");
    }
  });

  assert.deepEqual(plan.env, {});
  assert.deepEqual(plan.args, ["build"]);
  assert.equal(plan.usingWasmFallback, false);
});

test("does not enable SWC WASM fallback outside macOS arm64", () => {
  const plan = createNextBuildPlan({
    arch: "x64",
    nativeSwcLoadable: false,
    platform: "linux",
    resolveWasmDirectory: () => {
      throw new Error("WASM directory should not be resolved");
    }
  });

  assert.deepEqual(plan.env, {});
  assert.deepEqual(plan.args, ["build"]);
  assert.equal(plan.usingWasmFallback, false);
});
