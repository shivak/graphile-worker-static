import { ParsedCronItem, Runner, RunnerOptions, TaskList } from "./interfaces";
export declare const runMigrations: (options: RunnerOptions) => Promise<void>;
export declare const runOnce: (options: RunnerOptions, overrideTaskList?: TaskList) => Promise<void>;
export declare const run: (options: RunnerOptions, overrideTaskList?: TaskList, overrideParsedCronItems?: Array<ParsedCronItem>) => Promise<Runner>;
