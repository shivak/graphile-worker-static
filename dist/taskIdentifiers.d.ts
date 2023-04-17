import { TaskList, WithPgClient } from "./interfaces";
import { CompiledSharedOptions } from "./lib";
export interface SupportedTaskIdentifierByTaskId {
    [id: number]: string;
}
interface TaskDetails {
    supportedTaskIdentifierByTaskId: SupportedTaskIdentifierByTaskId;
    taskIds: number[];
}
export declare function getTaskDetails(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient, tasks: TaskList): TaskDetails | Promise<TaskDetails>;
export declare function getSupportedTaskIdentifierByTaskId(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient, tasks: TaskList): SupportedTaskIdentifierByTaskId | Promise<SupportedTaskIdentifierByTaskId>;
export declare function getSupportedTaskIds(compiledSharedOptions: CompiledSharedOptions, withPgClient: WithPgClient, tasks: TaskList): number[] | Promise<number[]>;
export {};
