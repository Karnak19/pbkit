---
title: Find slow endpoints
description: Use `pbkit logs` to spot which PocketBase endpoints are slow or failing, then look at the requests behind them.
sidebar:
  order: 9
---

PocketBase records every request in its logs, with the status code and how long
it took. `pbkit logs` reads those logs from your terminal, so you can go from
"the app feels slow" to "this endpoint, these requests" in a couple of commands.

## Authenticate

Log commands authenticate as a superuser, exactly like `pbkit schema`. Set
credentials in the environment (preferred) — they are never passed inline:

```bash
export POCKETBASE_URL="https://my-pb.example.com"
export POCKETBASE_ADMIN_EMAIL="admin@example.com"
export POCKETBASE_ADMIN_PASSWORD="••••••••"
```

If you already have an admin token, use `POCKETBASE_ADMIN_TOKEN` instead of the
email/password pair. When env vars are absent, pbkit falls back to the API
`input` (`url`/`token`) in your `pbkit.config.ts`.

## Get the overview

Start with a summary of the last day, one row per endpoint:

```bash
pbkit logs top --since 24h
```

```
CALLS  ERRORS   P50   P95    MAX  ROUTE
  412       0  38ms  1.9s   4.2s  GET /api/collections/posts/records
   97       3  12ms  45ms  310ms  PATCH /api/collections/posts/records/:id
 1840       0   4ms  11ms   90ms  GET /api/files/posts/:id/:file
```

How to read it:

- **CALLS** is how many requests hit that endpoint in the window.
- **ERRORS** counts the ones that answered with a status of 400 or more.
- **P50** is the typical request: half were faster, half slower.
- **P95** is the slow end: only 1 request in 20 took longer. This is the column
  rows are sorted by, and usually the one to look at first.
- **MAX** is the single slowest request. One big number here with a low P95 is
  often a one-off.
- **ROUTE** is the method and URL, with the query string dropped and record ids
  replaced by `:id`, so requests for different records add up in one row.

If you care more about failures than speed, rank by errors instead:

```bash
pbkit logs top --since 24h --sort errors
```

## Look at the individual requests

Once you know which endpoint is the problem, list the slow requests with their
details (who made them, IP, user agent, extra details):

```bash
pbkit logs --slow 1000 -v
```

To focus on one endpoint, add a `--filter` on its URL. Any PocketBase filter
works, and it combines with the other flags:

```bash
pbkit logs --since 24h --slow 1000 -v \
  --filter "data.url ~ '/api/collections/posts/'"
```

The full URL is shown here, query string included, which is often where the
answer is: a big `perPage`, a heavy `expand`, or a filter with no index behind
it.

## Watch it live

If you can reproduce the slowness, follow the logs while you click around:

```bash
pbkit logs -f --filter "data.url ~ '/api/collections/posts/'"
```

## Limits to keep in mind

- **Timings are for whole HTTP requests**, as PocketBase saw them, not for
  individual SQL queries. A slow endpoint tells you where to look, not which
  query is to blame.
- **`top` does the math on your machine.** It downloads the logs in the window
  and stops at `--max` logs (20000 by default). If it stops early it prints a
  warning that the numbers are partial; narrow `--since` or raise `--max`.
- **`-f` lags a few seconds.** PocketBase writes logs to its database in
  batches, so a request can show up a little after it happened. That is normal.
- **Old logs are gone.** PocketBase only keeps logs as long as its log retention
  setting says (set from the Logs page of the admin dashboard). If `--since 7d`
  comes back thin, that is probably why.

See the [CLI reference](/reference/cli#pbkit-logs) for every option.
