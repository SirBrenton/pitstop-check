# pitstop-check

Find retry bugs that turn rate limits into request storms.

```bash
npx pitstop-check ./src
```

-----

## Example

Ran against [OpenClaw](https://github.com/openclaw/openclaw) (~323k stars):

```
[WARN] src/agents/venice-models.ts:24 — 429 handled without Retry-After
[WARN] src/agents/venice-models.ts:24 — All 429s treated as retryable — CAP vs WAIT not distinguished

pitstop-check found 2 issues
```

The retry primitive supports `retryAfterMs`. The callers don’t wire it up.

When the API returns `Retry-After: 600`, the client retries on its own schedule instead of backing off — consistent with [issue #49811](https://github.com/openclaw/openclaw/issues/49811).

-----

## What it flags

- **429 without Retry-After** — ignores server’s backoff signal
- **Blanket 429 retry** — no CAP vs WAIT distinction
- **Unbounded retry loops** — no max elapsed time

Heuristic-based — best signal in API clients and retry wrappers.

-----

## Why this matters

A `429 + Retry-After` is a coordination signal, not just an error.

Under concurrency:

```
t=0   10 workers → 429 Retry-After: 2
t=1   10 retries → still 429
      20 in-flight → 40 → 80
```

The upstream is behaving correctly. The client amplifies pressure.

Most retry logic collapses three cases:

```
WAIT  — respect Retry-After, hold until the window clears
CAP   — limit concurrent retries and total elapsed time
STOP  — terminal failure, retrying makes it worse
```

into:

```python
if error:
    retry()
```

-----

## Usage

```bash
npx pitstop-check ./src
npx pitstop-check ./src/api/client.ts
```

-----

## Notes

- TypeScript / JavaScript only
- Heuristic — expect false positives (especially in tests)
- Best used as a review aid

-----

## Related

- [pitstop-scan](https://github.com/SirBrenton/pitstop-scan) — runtime exhaust analysis for AI/API execution failures