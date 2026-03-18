import { SourceFile } from "ts-morph";

export type Issue = {
  file: string;
  line: number;
  message: string;
};

export function checkRetryIssues(sourceFile: SourceFile): Issue[] {
  const issues: Issue[] = [];
  const text = sourceFile.getFullText();
  const file = sourceFile.getFilePath();

  const hasRetry = /retry|attempt|backoff|setTimeout|while\s*\(true\)|continue/i.test(text);
  const has429 = /(status\s*===\s*429|status\s*==\s*429|429)/.test(text);

  const hasBound =
    /(maxAttempts|maxRetries|maxElapsed|deadline|timeout)/i.test(text) ||
    /(attempt\s*[<>]=?\s*\d+|\battempts?\s*[<>]=?\s*\d+)/i.test(text);

  const distinguishes429Cause =
    /(quota|context_length|payload too large|too large|tpm|rpm|cap|capacity)/i.test(text);

  const consultsRetryAfter = /retry-after/i.test(text);

  // RULE 1: retry behavior with no real bound
  if (hasRetry && !hasBound) {
    issues.push({
      file,
      line: 1,
      message: "Retry logic without max bound — possible infinite retries",
    });
  }

  // RULE 2: 429 handling without Retry-After
  if (has429 && !consultsRetryAfter) {
    issues.push({
      file,
      line: 1,
      message: "429 handled without Retry-After — likely incorrect retry behavior",
    });
  }

  // RULE 3: blanket 429 retry without CAP vs WAIT distinction
  if (has429 && hasRetry && !distinguishes429Cause) {
    issues.push({
      file,
      line: 1,
      message: "All 429s treated as retryable — CAP vs WAIT not distinguished",
    });
  }

  return issues;
}