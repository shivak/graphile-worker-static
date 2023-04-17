import { Job, TaskList, WithPgClient } from "../interfaces";
import { CompiledSharedOptions } from "../lib";
export declare function isPromise<T>(t: T | Promise<T>): t is Promise<T>;
export declare function getJob(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient, tasks: TaskList, workerId: string, useNodeTime: boolean, flagsToSkip: string[] | null): Promise<Job | undefined>;
