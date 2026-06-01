---
title: Install pbkit
description: How to install pbkit in your project.
sidebar:
  order: 1
---

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- A PocketBase instance or an exported schema JSON file

## Install

```bash
bun add @karnak19/pbkit pocketbase
```

## Verify

```bash
bunx pbkit --help
```

You should see:

```
pbkit — PocketBase code generation toolkit

Usage:
  pbkit generate [--config <path>] [--watch]
  pbkit --help
```

## Next steps

- Follow [Your first typed SDK](/tutorials/your-first-sdk) to generate your first SDK
- Read the [configuration reference](/reference/configuration) for all available options
