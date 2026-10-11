---
"@karnak19/pbkit": minor
---

Add a `pbkit logs` CLI subcommand for reading PocketBase logs from the admin
API. Lists recent logs oldest-first, one line each (time, level, and for
requests the method, status, URL and latency, colored when slow). Supports
`--limit/-n`, `--since`, `--level`, `--slow`, `--errors`, `--filter`,
`--json`, `--verbose/-v` (auth, IP, referer, user agent, details),
`--follow/-f` and `--include-self`, plus `logs get <id>`, `logs stats` and
`logs top` (per-endpoint calls, errors and p50/p95/max latency over a time
window, to find slow or failing endpoints). Uses the same superuser auth as
`pbkit schema`.

Also fixes subcommands (`pbkit schema …`, `pbkit generate`) running the
default generate step a second time after they finish.
