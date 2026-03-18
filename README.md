# pitstop-check

Catch common retry anti-patterns before they hit production.

## What it checks

- 429 handled without `Retry-After`
- Blanket retry of all 429s without CAP vs WAIT distinction

## Quickstart

```bash
npm install
npm run build
npm link
pitstop-check ./sample-bad-retry
```

Example output

[WARN] sample-bad-retry/src/retry.ts:1 — 429 handled without Retry-After — likely incorrect retry behavior
[WARN] sample-bad-retry/src/retry.ts:1 — All 429s treated as retryable — CAP vs WAIT not distinguished

pitstop-check found 2 issues

## Why this exists

Most retry bugs are obvious in hindsight but invisible in code review.

pitstop-check is a tiny local-first CLI that flags common retry mistakes before they become latency, cost, or reliability problems.
