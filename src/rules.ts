import { SourceFile } from "ts-morph";

export interface Issue {
  file: string;
  line: number;
  message: string;
}

function firstMatchLine(source: string, patterns: RegExp[]): number {
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of patterns) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
  }

  return 1;
}

export function checkRetryAfterIgnored(file: SourceFile): Issue | null {
  const source = file.getFullText();

  const has429 = /\b429\b/.test(source);
  const hasRetryAfter = /retry-after/i.test(source);

  if (!has429 || hasRetryAfter) return null;

  return {
    file: file.getFilePath(),
    line: firstMatchLine(source, [/\b429\b/, /status.*429/i, /429.*status/i]),
    message: "429 handled without Retry-After — likely incorrect retry behavior",
  };
}

export function checkUnboundedRetry(file: SourceFile): Issue | null {
  const source = file.getFullText();

  const hasInfiniteLoop = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/i.test(source);
  const hasBound = /maxAttempts|maxRetries|maxElapsed|deadline|timeout|attempt\s*[<>]=?\s*\d+/i.test(source);

  if (!hasInfiniteLoop || hasBound) return null;

  return {
    file: file.getFilePath(),
    line: firstMatchLine(source, [/while\s*\(\s*true\s*\)/i, /for\s*\(\s*;\s*;\s*\)/i]),
    message: "No max elapsed bound — retries may be unbounded",
  };
}

export function checkBlanket429(file: SourceFile): Issue | null {
  const source = file.getFullText();

  const has429 = /\b429\b/.test(source);
  const hasRetryBehavior = /continue|retry|setTimeout|backoff|attempt/i.test(source);
  const hasClassification = /\bCAP\b|\bWAIT\b|\bSTOP\b|quota|burst|tpm|rpm|capacity|context_length|payload too large|too large/i.test(source);

  if (!has429 || !hasRetryBehavior || hasClassification) return null;

  return {
    file: file.getFilePath(),
    line: firstMatchLine(source, [/\b429\b/, /status.*429/i, /429.*status/i]),
    message: "All 429s treated as retryable — CAP vs WAIT not distinguished",
  };
}

export function checkRetryIssues(file: SourceFile): Issue[] {
  const issues: Issue[] = [];

  const maybeIssues = [
    checkRetryAfterIgnored(file),
    checkUnboundedRetry(file),
    checkBlanket429(file),
  ];

  for (const issue of maybeIssues) {
    if (issue) issues.push(issue);
  }

  return issues;
}