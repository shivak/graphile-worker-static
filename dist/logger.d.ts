import { LogFunctionFactory as GraphileLogFunctionFactory, Logger as GraphileLogger } from "@graphile/logger";
export interface LogScope {
    label?: string;
    workerId?: string;
    taskIdentifier?: string;
    jobId?: string;
}
export declare class Logger extends GraphileLogger<LogScope> {
}
export declare type LogFunctionFactory = GraphileLogFunctionFactory<LogScope>;
export declare const consoleLogFactory: (scope: Partial<LogScope>) => (level: import("@graphile/logger").LogLevel, message: string) => void;
export declare const defaultLogger: Logger;
