import { DbJob, WithPgClient } from "../interfaces";
import { CompiledSharedOptions } from "../lib";
export declare function failJob(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient, workerId: string, job: DbJob, message: string, replacementPayload: undefined | any[]): Promise<void>;
export declare function failJobs(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient, workerIds: string[], jobs: DbJob[], message: string): Promise<DbJob[]>;
