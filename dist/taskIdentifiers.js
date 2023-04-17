"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportedTaskIds = exports.getSupportedTaskIdentifierByTaskId = exports.getTaskDetails = void 0;
const assert = require("assert");
const cacheByOptions = new Map();
function getTaskDetails(compiledSharedOptions, withPgClient, tasks) {
    let cache = cacheByOptions.get(compiledSharedOptions);
    if (!cache) {
        cache = {
            lastStr: "",
            lastDigest: {
                supportedTaskIdentifierByTaskId: {},
                taskIds: [],
            },
        };
        cacheByOptions.set(compiledSharedOptions, cache);
    }
    const supportedTaskNames = Object.keys(tasks);
    const str = JSON.stringify(supportedTaskNames);
    if (str !== cache.lastStr) {
        const { escapedWorkerSchema } = compiledSharedOptions;
        assert(supportedTaskNames.length, "No runnable tasks!");
        cache.lastStr = str;
        cache.lastDigest = (async () => {
            const { rows } = await withPgClient(async (client) => {
                await client.query({
                    text: `insert into ${escapedWorkerSchema}.tasks (identifier) select unnest($1::text[]) on conflict do nothing`,
                    values: [supportedTaskNames],
                });
                return client.query({
                    text: `select id, identifier from ${escapedWorkerSchema}.tasks where identifier = any($1::text[])`,
                    values: [supportedTaskNames],
                });
            });
            const supportedTaskIdentifierByTaskId = Object.create(null);
            for (const row of rows) {
                supportedTaskIdentifierByTaskId[row.id] = row.identifier;
            }
            const taskIds = Object.keys(supportedTaskIdentifierByTaskId).map((s) => parseInt(s, 10));
            // Overwrite promises with concrete values
            cache.lastDigest = {
                supportedTaskIdentifierByTaskId,
                taskIds,
            };
            cache.lastStr = str;
            return cache.lastDigest;
        })();
    }
    return cache.lastDigest;
}
exports.getTaskDetails = getTaskDetails;
function getSupportedTaskIdentifierByTaskId(compiledSharedOptions, withPgClient, tasks) {
    const p = getTaskDetails(compiledSharedOptions, withPgClient, tasks);
    if ("supportedTaskIdentifierByTaskId" in p) {
        return p.supportedTaskIdentifierByTaskId;
    }
    else {
        return p.then((o) => o.supportedTaskIdentifierByTaskId);
    }
}
exports.getSupportedTaskIdentifierByTaskId = getSupportedTaskIdentifierByTaskId;
function getSupportedTaskIds(compiledSharedOptions, withPgClient, tasks) {
    const p = getTaskDetails(compiledSharedOptions, withPgClient, tasks);
    if ("taskIds" in p) {
        return p.taskIds;
    }
    else {
        return p.then((o) => o.taskIds);
    }
}
exports.getSupportedTaskIds = getSupportedTaskIds;
//# sourceMappingURL=taskIdentifiers.js.map