import { Pool } from "pg";
import { AddJobFunction, RunnerOptions, SharedOptions, WithPgClient, WorkerEvents } from "./interfaces";
import { Logger, LogScope } from "./logger";
export interface CompiledSharedOptions {
    events: WorkerEvents;
    logger: Logger;
    workerSchema: string;
    escapedWorkerSchema: string;
    maxContiguousErrors: number;
    useNodeTime: boolean;
    minResetLockedInterval: number;
    maxResetLockedInterval: number;
    options: SharedOptions;
}
interface ProcessSharedOptionsSettings {
    scope?: LogScope;
}
export declare function processSharedOptions(options: SharedOptions, { scope }?: ProcessSharedOptionsSettings): CompiledSharedOptions;
export declare type Releasers = Array<() => void | Promise<void>>;
export declare function assertPool(options: SharedOptions, releasers: Releasers): Promise<Pool>;
export declare type Release = () => Promise<void>;
export declare function withReleasers<T>(callback: (releasers: Releasers, release: Release) => Promise<T>): Promise<T>;
interface ProcessOptionsExtensions {
    pgPool: Pool;
    withPgClient: WithPgClient;
    addJob: AddJobFunction;
    release: Release;
    releasers: Releasers;
}
export interface CompiledOptions extends CompiledSharedOptions, ProcessOptionsExtensions {
}
export declare const getUtilsAndReleasersFromOptions: (options: RunnerOptions, settings?: ProcessSharedOptionsSettings) => Promise<CompiledOptions>;
export {};
