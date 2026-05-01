---
title: Installation
description: How to install pbkit in your project.
sidebar:
  order: 1
---

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- A PocketBase instance or an exported schema JSON file

## Install

```bash
bun add @karnak19/pbkit
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

- Follow the [Quick Start](/getting-started/quick-start) guide to generate your first SDK
- Read the [configuration reference](/configuration/pbkit-config) for all available options
