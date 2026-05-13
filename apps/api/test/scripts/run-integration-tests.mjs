#!/usr/bin/env node

import { spawn } from "node:child_process";
import { URL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { readdir, rm } from "node:fs/promises";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(scriptDir, "../..");
const repoRoot = resolve(apiDir, "../..");
const schemaPath = resolve(repoRoot, "prisma/schema.prisma");
const integrationBuildDir = resolve(apiDir, ".test-dist");
const integrationTestsBuildDir = resolve(integrationBuildDir, "test/integration");

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  process.stderr.write("TEST_DATABASE_URL is required to run API integration tests.\n");
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(testDatabaseUrl);
} catch {
  process.stderr.write("TEST_DATABASE_URL must be a valid URL.\n");
  process.exit(1);
}

const databaseName = parsedUrl.pathname.replace(/^\//u, "");
if (!/test/iu.test(databaseName)) {
  process.stderr.write(
    [
      "Refusing to reset a non-test database.",
      `Resolved database name: ${databaseName || "<empty>"}`,
      "Expected TEST_DATABASE_URL path to contain 'test'."
    ].join("\n") + "\n"
  );
  process.exit(1);
}

const sharedEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  NODE_ENV: "test"
};

await runCommand(
  "pnpm",
  [
    "exec",
    "prisma",
    "db",
    "push",
    "--force-reset",
    "--skip-generate",
    "--schema",
    schemaPath
  ],
  {
    cwd: repoRoot,
    env: sharedEnv
  }
);

await rm(integrationBuildDir, { force: true, recursive: true });

await runCommand("pnpm", ["exec", "tsc", "-p", "tsconfig.integration.json"], {
  cwd: apiDir,
  env: sharedEnv
});

const testFiles = await collectTestFiles(integrationTestsBuildDir);
if (testFiles.length === 0) {
  throw new Error(`No compiled integration tests found in ${integrationTestsBuildDir}`);
}

await runCommand("node", ["--import", "tsx", "--test", "--test-force-exit", ...testFiles], {
  cwd: apiDir,
  env: sharedEnv
});

function runCommand(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: "inherit"
    });

    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function collectTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectTestFiles(entryPath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.js")) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}
