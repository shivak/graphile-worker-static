import { WithPgClient } from "../interfaces";
import { CompiledSharedOptions } from "../lib";
export declare function resetLockedAt(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient): Promise<void>;
