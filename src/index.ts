#!/usr/bin/env node

import { Project } from "ts-morph";
import { checkRetryIssues, Issue } from "./rules";
import path from "path";
import fs from "fs";

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
  if (filePath.includes("/node_modules/")) continue;
  if (filePath.includes("/dist/")) continue;

  // when testing inside this repo, don't scan the tool itself
  if (targetDir === process.cwd() && filePath.includes("/src/")) continue;

  const issues: Issue[] = checkRetryIssues(file);

  for (const issue of issues) {
    console.log(`[WARN] ${issue.file}:${issue.line} — ${issue.message}`);
  }

  totalIssues += issues.length;
}

if (totalIssues === 0) {
  console.log("pitstop-check found no issues");
} else {
  console.log(`\npitstop-check found ${totalIssues} issues`);
}