"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetLockedAt = void 0;
async function resetLockedAt(compiledSharedOptions, withPgClient) {
    const { escapedWorkerSchema, workerSchema, options: { noPreparedStatements }, useNodeTime, } = compiledSharedOptions;
    const now = useNodeTime ? "$1::timestamptz" : "now()";
    await withPgClient((client) => client.query({
        text: `\
with j as (
update ${escapedWorkerSchema}.jobs
set locked_at = null, locked_by = null, run_at = greatest(run_at, now())
where locked_at < ${now} - interval '4 hours'
)
update ${escapedWorkerSchema}.job_queues
set locked_at = null, locked_by = null
where locked_at < ${now} - interval '4 hours'`,
        values: useNodeTime ? [new Date().toISOString()] : [],
        name: noPreparedStatements
            ? undefined
            : `clear_stale_locks${useNodeTime ? "N" : ""}/${workerSchema}`,
    }));
}
exports.resetLockedAt = resetLockedAt;
//# sourceMappingURL=resetLockedAt.js.map