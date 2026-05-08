#!/usr/bin/env node

import { Project } from "ts-morph";
import { checkRetryIssues, Issue } from "./rules";
import path from "path";
import fs from "fs";

const IGNORE_PATTERNS = [
  // existing
  "/node_modules/",
  "/dist/",
  "/build/",
  "/_next/",
  "/chunks/",
  ".min.js",
  ".min.ts",
  // from learning log — architecture exclusions
  "/vendor/",
  "/static/img/",
  "/static/logo",
  "/vditor/",
  // mock and test infrastructure
  "/mock-llm-server/",
  "/mock-server/",
  "/scripts/mock",
  "/scripts/test",
  "/__tests__/",
  "/mocks/",
  "/__mocks__/",
  ".mock.ts",
  ".mock.js",
  // application build and lint scripts (not API clients)
  "/apps/web/scripts/",
  "/scripts/check-",
  // non-API-client paths
  "health-check",
  "device-auth",
  // SvelteKit server route handlers
  "+server.ts",
  "+server.js",
];

const isTestFile = (p: string) =>
  p.endsWith(".test.ts") ||
  p.endsWith(".test.js") ||
  p.endsWith(".spec.ts") ||
  p.endsWith(".spec.js");

const isServerRouteHandler = (p: string) =>
  p.endsWith("+server.ts") ||
  p.endsWith("+server.js");

const isMockOrTestInfra = (p: string) =>
  p.includes("/mock-") ||
  p.includes("/scripts/mock") ||
  p.includes("/scripts/test");

const targetArg = process.argv[2];

if (!targetArg) {
  console.error("Usage: node dist/index.js <path>");
  process.exit(1);
}

const targetDir = path.resolve(targetArg);

if (!fs.existsSync(targetDir)) {
  console.error(`Path does not exist: ${targetDir}`);
  process.exit(1);
}

const project = new Project();
project.addSourceFilesAtPaths([
  path.join(targetDir, "**/*.ts"),
  path.join(targetDir, "**/*.js"),
]);

let totalIssues = 0;

for (const file of project.getSourceFiles()) {
  const filePath = file.getFilePath();

  // hard excludes
  if (IGNORE_PATTERNS.some((p) => filePath.includes(p))) continue;
  if (isTestFile(filePath)) continue;
  if (isServerRouteHandler(filePath)) continue;
  if (isMockOrTestInfra(filePath)) continue;

  // when testing inside this repo, don't scan the tool itself
  if (targetDir === process.cwd() && filePath.includes("/src/")) continue;

  const issues: Issue[] = checkRetryIssues(file);

  for (const issue of issues) {
    const rel = path.relative(process.cwd(), issue.file);
    console.log(`[WARN] ${rel}:${issue.line} — ${issue.message}`);
  }

  totalIssues += issues.length;
}

if (totalIssues === 0) {
  console.log("pitstop-check found no issues");
} else {
  console.log(`\npitstop-check found ${totalIssues} issues`);
}