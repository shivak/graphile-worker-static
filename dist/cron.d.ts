import { Pool } from "pg";
import { Cron, ParsedCronItem, RunnerOptions, WorkerEvents } from "./interfaces";
import { Releasers } from "./lib";
interface CronRequirements {
    pgPool: Pool;
    events: WorkerEvents;
}
/**
 * Executes our scheduled jobs as required.
 *
 * This is not currently intended for usage directly; use `run` instead.
 *
 * @internal
 *
 * @param options - the common options
 * @param parsedCronItems - MUTABLE list of _parsed_ cron items to monitor. Do not assume this is static.
 * @param requirements - the helpers that this task needs
 */
export declare const runCron: (options: RunnerOptions, parsedCronItems: ParsedCronItem[], requirements: CronRequirements) => Cron;
export declare function getParsedCronItemsFromOptions(options: RunnerOptions, releasers: Releasers): Promise<Array<ParsedCronItem>>;
export {};
