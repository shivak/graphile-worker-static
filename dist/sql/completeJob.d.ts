import { DbJob, WithPgClient } from "../interfaces";
import { CompiledSharedOptions } from "../lib";
export declare function completeJob(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient, workerId: string, job: DbJob): Promise<void>;
