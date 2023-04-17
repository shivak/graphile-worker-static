"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaults = void 0;
const cosmiconfig_1 = require("cosmiconfig");
const cosmiconfigResult = (0, cosmiconfig_1.cosmiconfigSync)("graphile-worker").search();
const cosmiconfig = cosmiconfigResult?.config;
exports.defaults = {
    schema: process.env.GRAPHILE_WORKER_SCHEMA ||
        enforceStringOrUndefined("schema", cosmiconfig?.schema) ||
        "graphile_worker",
    maxContiguousErrors: enforceNumberOrUndefined("maxContiguousErrors", cosmiconfig?.maxContiguousErrors) || 10,
    pollInterval: enforceNumberOrUndefined("pollInterval", cosmiconfig?.pollInterval) || 2000,
    concurrentJobs: enforceNumberOrUndefined("concurrentJobs", cosmiconfig?.concurrentJobs) ||
        1,
    maxPoolSize: enforceNumberOrUndefined("maxPoolSize", cosmiconfig?.maxPoolSize) || 10,
};
function enforceStringOrUndefined(keyName, str) {
    if (typeof str === "string") {
        return str;
    }
    else if (!str) {
        return undefined;
    }
    else {
        throw new Error(`Expected '${keyName}' to be a string (or not set), but received ${typeof str}`);
    }
}
function enforceNumberOrUndefined(keyName, nr) {
    if (typeof nr === "number") {
        return nr;
    }
    else if (typeof nr === "string") {
        const val = parseFloat(nr);
        if (isFinite(val)) {
            return val;
        }
        else {
            throw new Error(`Expected '${keyName}' to be a number (or not set), but received ${nr}`);
        }
    }
    else if (!nr) {
        return undefined;
    }
    else {
        throw new Error(`Expected '${keyName}' to be a number (or not set), but received ${typeof nr}`);
    }
}
//# sourceMappingURL=config.js.map