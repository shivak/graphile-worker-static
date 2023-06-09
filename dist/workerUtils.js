"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickAddJob = exports.makeWorkerUtils = void 0;
const lib_1 = require("./lib");
const migrate_1 = require("./migrate");
/**
 * Construct (asynchronously) a new WorkerUtils instance.
 */
async function makeWorkerUtils(options) {
    const { logger, escapedWorkerSchema, release, withPgClient, addJob } = await (0, lib_1.getUtilsAndReleasersFromOptions)(options, {
        scope: {
            label: "WorkerUtils",
        },
    });
    return {
        withPgClient,
        logger,
        release,
        addJob,
        migrate: () => withPgClient((pgClient) => (0, migrate_1.migrate)(options, pgClient)),
        async completeJobs(ids) {
            const { rows } = await withPgClient((client) => client.query(`select * from ${escapedWorkerSchema}.complete_jobs($1)`, [ids]));
            return rows;
        },
        async permanentlyFailJobs(ids, reason) {
            const { rows } = await withPgClient((client) => client.query(`select * from ${escapedWorkerSchema}.permanently_fail_jobs($1, $2)`, [ids, reason || null]));
            return rows;
        },
        async rescheduleJobs(ids, options) {
            const { rows } = await withPgClient((client) => client.query(`select * from ${escapedWorkerSchema}.reschedule_jobs(
            $1,
            run_at := $2,
            priority := $3,
            attempts := $4,
            max_attempts := $5
          )`, [
                ids,
                options.runAt || null,
                options.priority || null,
                options.attempts || null,
                options.maxAttempts || null,
            ]));
            return rows;
        },
    };
}
exports.makeWorkerUtils = makeWorkerUtils;
/**
 * This function can be used to quickly add a job; however if you need to call
 * this more than once in your process you should instead create a WorkerUtils
 * instance for efficiency and performance sake.
 */
async function quickAddJob(options, identifier, payload = {}, spec = {}) {
    const utils = await makeWorkerUtils(options);
    try {
        return await utils.addJob(identifier, payload, spec);
    }
    finally {
        await utils.release();
    }
}
exports.quickAddJob = quickAddJob;
//# sourceMappingURL=workerUtils.js.map