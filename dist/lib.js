"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUtilsAndReleasersFromOptions = exports.withReleasers = exports.assertPool = exports.processSharedOptions = void 0;
const assert = require("assert");
const events_1 = require("events");
const pg_1 = require("pg");
const config_1 = require("./config");
const cronConstants_1 = require("./cronConstants");
const helpers_1 = require("./helpers");
const logger_1 = require("./logger");
const migrate_1 = require("./migrate");
const _sharedOptionsCache = new WeakMap();
function processSharedOptions(options, { scope } = {}) {
    let compiled = _sharedOptionsCache.get(options);
    if (!compiled) {
        const { logger = logger_1.defaultLogger, schema: workerSchema = config_1.defaults.schema, events = new events_1.EventEmitter(), useNodeTime = false, minResetLockedInterval = 8 * cronConstants_1.MINUTE, maxResetLockedInterval = 10 * cronConstants_1.MINUTE, } = options;
        const escapedWorkerSchema = pg_1.Client.prototype.escapeIdentifier(workerSchema);
        if (!Number.isFinite(minResetLockedInterval) ||
            !Number.isFinite(maxResetLockedInterval) ||
            minResetLockedInterval < 1 ||
            maxResetLockedInterval < minResetLockedInterval) {
            throw new Error(`Invalid values for minResetLockedInterval (${minResetLockedInterval})/maxResetLockedInterval (${maxResetLockedInterval})`);
        }
        compiled = {
            events,
            logger,
            workerSchema,
            escapedWorkerSchema,
            maxContiguousErrors: config_1.defaults.maxContiguousErrors,
            useNodeTime,
            minResetLockedInterval,
            maxResetLockedInterval,
            options,
        };
        _sharedOptionsCache.set(options, compiled);
    }
    if (scope) {
        return {
            ...compiled,
            logger: compiled.logger.scope(scope),
        };
    }
    else {
        return compiled;
    }
}
exports.processSharedOptions = processSharedOptions;
async function assertPool(options, releasers) {
    const { logger } = processSharedOptions(options);
    assert(!options.pgPool || !options.connectionString, "Both `pgPool` and `connectionString` are set, at most one of these options should be provided");
    let pgPool;
    const connectionString = options.connectionString || process.env.DATABASE_URL;
    if (options.pgPool) {
        pgPool = options.pgPool;
    }
    else if (connectionString) {
        pgPool = new pg_1.Pool({
            connectionString,
            max: options.maxPoolSize,
        });
        releasers.push(() => {
            pgPool.end();
        });
    }
    else if (process.env.PGDATABASE) {
        pgPool = new pg_1.Pool({
            /* Pool automatically pulls settings from envvars */
            max: options.maxPoolSize,
        });
        releasers.push(() => {
            pgPool.end();
        });
    }
    else {
        throw new Error("You must either specify `pgPool` or `connectionString`, or you must make the `DATABASE_URL` or `PG*` environmental variables available.");
    }
    const handlePoolError = (err) => {
        /*
         * This handler is required so that client connection errors on clients
         * that are alive but not checked out don't bring the server down (via
         * `unhandledError`).
         *
         * `pg` will automatically terminate the client and remove it from the
         * pool, so we don't actually need to take any action here, just ensure
         * that the event listener is registered.
         */
        logger.error(`PostgreSQL idle client generated error: ${err.message}`, {
            error: err,
        });
    };
    const handleClientError = (err) => {
        /*
         * This handler is required so that client connection errors on clients
         * that are checked out of the pool don't bring the server down (via
         * `unhandledError`).
         *
         * `pg` will automatically raise the error from the client the next time it
         * attempts a query, so we don't actually need to take any action here,
         * just ensure that the event listener is registered.
         */
        logger.error(`PostgreSQL active client generated error: ${err.message}`, {
            error: err,
        });
    };
    pgPool.on("error", handlePoolError);
    const handlePoolConnect = (client) => {
        client.on("error", handleClientError);
    };
    pgPool.on("connect", handlePoolConnect);
    releasers.push(() => {
        pgPool.removeListener("error", handlePoolError);
        pgPool.removeListener("connect", handlePoolConnect);
    });
    return pgPool;
}
exports.assertPool = assertPool;
async function withReleasers(callback) {
    const releasers = [];
    const release = async () => {
        let firstError = null;
        // Call releasers in reverse order - LIFO queue.
        for (let i = releasers.length - 1; i >= 0; i--) {
            try {
                await releasers[i]();
            }
            catch (e) {
                firstError = firstError || e;
            }
        }
        if (firstError) {
            throw firstError;
        }
    };
    try {
        return await callback(releasers, release);
    }
    catch (e) {
        try {
            await release();
        }
        catch (e2) {
            /* noop */
        }
        throw e;
    }
}
exports.withReleasers = withReleasers;
const getUtilsAndReleasersFromOptions = async (options, settings = {}) => {
    const shared = processSharedOptions(options, settings);
    const { concurrency = config_1.defaults.concurrentJobs } = options;
    return withReleasers(async (releasers, release) => {
        const pgPool = await assertPool(options, releasers);
        // @ts-ignore
        const max = pgPool?.options?.max || 10;
        if (max < concurrency) {
            console.warn(`WARNING: having maxPoolSize (${max}) smaller than concurrency (${concurrency}) may lead to non-optimal performance.`);
        }
        const withPgClient = (0, helpers_1.makeWithPgClientFromPool)(pgPool);
        // Migrate
        await withPgClient((client) => (0, migrate_1.migrate)(options, client));
        const addJob = (0, helpers_1.makeAddJob)(options, withPgClient);
        return {
            ...shared,
            pgPool,
            withPgClient,
            addJob,
            release,
            releasers,
        };
    });
};
exports.getUtilsAndReleasersFromOptions = getUtilsAndReleasersFromOptions;
//# sourceMappingURL=lib.js.map