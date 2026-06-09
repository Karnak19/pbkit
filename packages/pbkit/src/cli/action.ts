import type { ArgsDef, CommandContext } from "citty"

/**
 * Wrap a command's `run` so expected errors (auth, config, API failures) print
 * a clean one-line message and exit, instead of citty's full stack dump.
 */
export function action<T extends ArgsDef>(
  fn: (ctx: CommandContext<T>) => Promise<void>,
): (ctx: CommandContext<T>) => Promise<void> {
  return async (ctx) => {
    try {
      await fn(ctx)
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    }
  }
}
