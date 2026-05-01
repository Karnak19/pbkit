---
title: CLI Usage
description: pbkit command-line interface reference.
sidebar:
  order: 1
---

## Commands

### `pbkit generate`

Generate types and SDK from your `pbkit.config.ts`.

```bash
bunx pbkit generate
```

#### Options

| Flag | Short | Description |
|---|---|---|
| `--config <path>` | `-c` | Path to a config file (defaults to auto-detection) |
| `--watch` | `-w` | Watch mode — regenerates every 10 seconds |
| `--help` | `-h` | Show help message |

### Config auto-detection

pbkit searches for a config file in the current working directory in this order:

1. `pbkit.config.ts`
2. `pbkit.config.js`
3. `pbkit.config.mjs`

### Watch mode

```bash
bunx pbkit generate --watch
```

In watch mode, pbkit polls the API (or re-reads the file) every 10 seconds and regenerates if the schema has changed. Press `Ctrl+C` to stop.

### Custom config path

```bash
bunx pbkit generate --config ./configs/pbkit.config.ts
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Error (config not found, API error, invalid config) |

## Example output

```
$ bunx pbkit generate
  src/generated/types.ts
  src/generated/sdk.ts
Generated 2 file(s) in 120ms
```
