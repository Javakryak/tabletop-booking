#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const projectRequire = createRequire(pathToFileURL(join(process.cwd(), "package.json")));

function hasArg(args, name) {
  return args.includes(name);
}

function runNodeProbe(source) {
  const result = spawnSync(process.execPath, ["-e", source], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  return result.status === 0;
}

export function canLoadNativeSwc() {
  try {
    const nextRequire = createRequire(projectRequire.resolve("next/package.json"));
    const nativeSwcPath = nextRequire.resolve("@next/swc-darwin-arm64");

    return runNodeProbe(`require(${JSON.stringify(nativeSwcPath)});`);
  } catch {
    return false;
  }
}

export function resolveWasmDirectory() {
  return dirname(projectRequire.resolve("@next/swc-wasm-nodejs/package.json"));
}

export function createNextBuildPlan({
  arch = process.arch,
  args = [],
  nativeSwcLoadable,
  platform = process.platform,
  resolveWasmDirectory: resolveWasm = resolveWasmDirectory
} = {}) {
  const buildArgs = ["build", ...args];
  const env = {};

  const shouldUseWasmFallback =
    platform === "darwin" &&
    arch === "arm64" &&
    !(nativeSwcLoadable ?? canLoadNativeSwc());

  if (shouldUseWasmFallback) {
    env.NEXT_TEST_WASM_DIR = resolveWasm();

    if (!hasArg(buildArgs, "--webpack") && !hasArg(buildArgs, "--turbopack")) {
      buildArgs.push("--webpack");
    }
  }

  return {
    args: buildArgs,
    env,
    usingWasmFallback: shouldUseWasmFallback
  };
}

export function runNextBuild(args = process.argv.slice(2)) {
  const plan = createNextBuildPlan({ args });
  const nextBin = projectRequire.resolve("next/dist/bin/next");

  if (plan.usingWasmFallback) {
    process.stderr.write(
      "Native Next.js SWC is not loadable on this macOS arm64 Node runtime; using SWC WASM with webpack for this build.\n"
    );
  }

  const result = spawnSync(process.execPath, [nextBin, ...plan.args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...plan.env
    },
    stdio: "inherit"
  });

  return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runNextBuild();
}
