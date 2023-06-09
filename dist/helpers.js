"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWithPgClientFromClient = exports.makeWithPgClientFromPool = exports.makeJobHelpers = exports.makeAddJob = void 0;
const lib_1 = require("./lib");
function makeAddJob(options, withPgClient) {
    const { escapedWorkerSchema, useNodeTime } = (0, lib_1.processSharedOptions)(options);
    return (identifier, payload = {}, spec = {}) => {
        return withPgClient(async (pgClient) => {
            const { rows } = await pgClient.query(`
        select * from ${escapedWorkerSchema}.add_job(
          identifier => $1::text,
          payload => $2::json,
          queue_name => $3::text,
          run_at => $4::timestamptz,
          max_attempts => $5::smallint,
          job_key => $6::text,
          priority => $7::smallint,
          flags => $8::text[],
          job_key_mode => $9::text
        );
        `, [
                identifier,
                JSON.stringify(payload),
                spec.queueName || null,
                // If there's an explicit run at, use that. Otherwise, if we've been
                // told to use Node time, use the current timestamp. Otherwise we'll
                // pass null and the function will use `now()` internally.
                spec.runAt
                    ? spec.runAt.toISOString()
                    : useNodeTime
                        ? new Date().toISOString()
                        : null,
                spec.maxAttempts || null,
                spec.jobKey || null,
                spec.priority || null,
                spec.flags || null,
                spec.jobKeyMode || null,
            ]);
            const job = rows[0];
            job.task_identifier = identifier;
            return job;
        });
    };
}
exports.makeAddJob = makeAddJob;
function makeJobHelpers(options, job, { withPgClient, logger: overrideLogger, }) {
    const baseLogger = overrideLogger || (0, lib_1.processSharedOptions)(options).logger;
    const logger = baseLogger.scope({
        label: "job",
        taskIdentifier: job.task_identifier,
        jobId: job.id,
    });
    const helpers = {
        job,
        logger,
        withPgClient,
        query: (queryText, values) => withPgClient((pgClient) => pgClient.query(queryText, values)),
        addJob: makeAddJob(options, withPgClient),
        // TODO: add an API for giving workers more helpers
    };
    // DEPRECATED METHODS
    Object.assign(helpers, {
        debug(format, ...parameters) {
            logger.error("REMOVED: `helpers.debug` has been replaced with `helpers.logger.debug`; please do not use `helpers.debug`");
            logger.debug(format, { parameters });
        },
    });
    return helpers;
}
exports.makeJobHelpers = makeJobHelpers;
function makeWithPgClientFromPool(pgPool) {
    return async (callback) => {
        const client = await pgPool.connect();
        try {
            return await callback(client);
        }
        finally {
            await client.release();
        }
    };
}
exports.makeWithPgClientFromPool = makeWithPgClientFromPool;
function makeWithPgClientFromClient(pgClient) {
    return async (callback) => {
        return callback(pgClient);
    };
}
exports.makeWithPgClientFromClient = makeWithPgClientFromClient;
//# sourceMappingURL=helpers.js.map