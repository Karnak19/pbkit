---
"@karnak19/pbkit": patch
---

Build the CLI on [citty](https://github.com/unjs/citty). Both `pbkit generate`
and `pbkit schema` (with its subcommands) now have auto-generated `--help`/usage
and consistent flag parsing — short flags like `-c` work everywhere. Existing
`generate` behavior is unchanged.
