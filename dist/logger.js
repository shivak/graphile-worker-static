"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLogger = exports.consoleLogFactory = exports.Logger = void 0;
// For backwards compatibility
if (process.env.GRAPHILE_WORKER_DEBUG) {
    process.env.GRAPHILE_LOGGER_DEBUG = process.env.GRAPHILE_WORKER_DEBUG;
}
const logger_1 = require("@graphile/logger");
// For backwards compatibility
class Logger extends logger_1.Logger {
}
exports.Logger = Logger;
exports.consoleLogFactory = (0, logger_1.makeConsoleLogFactory)();
exports.defaultLogger = new Logger((0, logger_1.makeConsoleLogFactory)({
    format: `[%s%s] %s: %s`,
    formatParameters(level, message, scope) {
        const taskText = scope.taskIdentifier ? `: ${scope.taskIdentifier}` : "";
        const jobIdText = scope.jobId ? `{${scope.jobId}}` : "";
        return [
            scope.label || "core",
            scope.workerId ? `(${scope.workerId}${taskText}${jobIdText})` : "",
            level.toUpperCase(),
            message,
        ];
    },
}));
//# sourceMappingURL=logger.js.map