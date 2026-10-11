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

/**
 * citty calls a parent command's `run` even after dispatching to one of its
 * subcommands. Parents with both `run` and `subCommands` use this to bail out
 * when the first positional named a subcommand.
 */
export function invokedSubCommand(args: { _: string[] }, subCommands: object): boolean {
  const first = args._[0]
  return first !== undefined && Object.hasOwn(subCommands, first)
}
