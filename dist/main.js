"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTaskListOnce = exports.runTaskList = exports._allWorkerPools = void 0;
const events_1 = require("events");
const util_1 = require("util");
const config_1 = require("./config");
const deferred_1 = require("./deferred");
const helpers_1 = require("./helpers");
const lib_1 = require("./lib");
const signals_1 = require("./signals");
const failJob_1 = require("./sql/failJob");
const resetLockedAt_1 = require("./sql/resetLockedAt");
const worker_1 = require("./worker");
const ENABLE_DANGEROUS_LOGS = process.env.GRAPHILE_ENABLE_DANGEROUS_LOGS === "1";
// Wait at most 60 seconds between connection attempts for LISTEN.
const MAX_DELAY = 60 * 1000;
const allWorkerPools = [];
exports._allWorkerPools = allWorkerPools;
/**
 * All pools share the same signal handlers, so we need to broadcast
 * gracefulShutdown to all the pools' events; we use this event emitter to
 * aggregate these requests.
 */
let _signalHandlersEventEmitter = new events_1.EventEmitter();
/**
 * Only register the signal handlers once _globally_.
 */
let _registeredSignalHandlers = false;
/**
 * Only trigger graceful shutdown once.
 */
let _shuttingDown = false;
/**
 * This will register the signal handlers to make sure the worker shuts down
 * gracefully if it can. It will only register signal handlers once; even if
 * you call it multiple times it will always use the first logger it is passed,
 * future calls will register the events but take no further actions.
 */
function registerSignalHandlers(logger, events) {
    if (_shuttingDown) {
        throw new Error("System has already gone into shutdown, should not be spawning new workers now!");
    }
    _signalHandlersEventEmitter.on("gracefulShutdown", (o) => events.emit("gracefulShutdown", o));
    if (_registeredSignalHandlers) {
        return;
    }
    _registeredSignalHandlers = true;
    signals_1.default.forEach((signal) => {
        logger.debug(`Registering signal handler for ${signal}`, {
            registeringSignalHandler: signal,
        });
        const removeHandler = () => {
            logger.debug(`Removing signal handler for ${signal}`, {
                unregisteringSignalHandler: signal,
            });
            process.removeListener(signal, handler);
        };
        const handler = function () {
            logger.error(`Received '${signal}'; attempting graceful shutdown...`);
            setTimeout(removeHandler, 5000);
            if (_shuttingDown) {
                return;
            }
            _shuttingDown = true;
            _signalHandlersEventEmitter.emit("gracefulShutdown", { signal });
            Promise.all(allWorkerPools.map((pool) => pool.gracefulShutdown(`Forced worker shutdown due to ${signal}`))).finally(() => {
                removeHandler();
                logger.error(`Graceful shutdown attempted; killing self via ${signal}`);
                process.kill(process.pid, signal);
            });
        };
        process.on(signal, handler);
    });
}
function runTaskList(options, tasks, pgPool) {
    const { logger, events } = (0, lib_1.processSharedOptions)(options);
    if (ENABLE_DANGEROUS_LOGS) {
        logger.debug(`Worker pool options are ${(0, util_1.inspect)(options)}`, { options });
    }
    const { concurrency = config_1.defaults.concurrentJobs, noHandleSignals } = options;
    if (!noHandleSignals) {
        // Clean up when certain signals occur
        registerSignalHandlers(logger, events);
    }
    const promise = (0, deferred_1.default)();
    const workers = [];
    let listenForChangesClient = null;
    const unlistenForChanges = async () => {
        if (listenForChangesClient) {
            const client = listenForChangesClient;
            listenForChangesClient = null;
            // Unsubscribe from jobs:insert topic
            try {
                await client.query('UNLISTEN "jobs:insert"');
            }
            catch (e) {
                // Ignore
            }
            await client.release();
        }
    };
    let active = true;
    let reconnectTimeout = null;
    const compiledSharedOptions = (0, lib_1.processSharedOptions)(options);
    const { minResetLockedInterval, maxResetLockedInterval } = compiledSharedOptions;
    const resetLockedDelay = () => Math.ceil(minResetLockedInterval +
        Math.random() * (maxResetLockedInterval - minResetLockedInterval));
    let resetLockedAtPromise;
    const resetLocked = () => {
        resetLockedAtPromise = (0, resetLockedAt_1.resetLockedAt)(compiledSharedOptions, withPgClient).then(() => {
            resetLockedAtPromise = undefined;
            if (active) {
                const delay = resetLockedDelay();
                events.emit("resetLocked:success", { pool: this, delay });
                resetLockedTimeout = setTimeout(resetLocked, delay);
            }
            else {
                events.emit("resetLocked:success", { pool: this, delay: null });
            }
        }, (e) => {
            resetLockedAtPromise = undefined;
            // TODO: push this error out via an event.
            if (active) {
                const delay = resetLockedDelay();
                events.emit("resetLocked:failure", { pool: this, error: e, delay });
                resetLockedTimeout = setTimeout(resetLocked, delay);
                logger.error(`Failed to reset locked; we'll try again in ${delay}ms`, {
                    error: e,
                });
            }
            else {
                events.emit("resetLocked:failure", {
                    pool: this,
                    error: e,
                    delay: null,
                });
                logger.error(`Failed to reset locked, but we're shutting down so won't try again`, {
                    error: e,
                });
            }
        });
        events.emit("resetLocked:started", { pool: this });
    };
    // Reset locked in the first 60 seconds, not immediately because we don't
    // want to cause a thundering herd.
    let resetLockedTimeout = setTimeout(resetLocked, Math.random() * Math.min(60000, maxResetLockedInterval));
    // This is a representation of us that can be interacted with externally
    const workerPool = {
        release: async () => {
            // IMPORTANT: if we assert that `active === true` here, we must ensure this is handled in `gracefulShutdown`
            active = false;
            clearTimeout(resetLockedTimeout);
            resetLockedTimeout = null;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            events.emit("pool:release", { pool: this });
            unlistenForChanges();
            promise.resolve(resetLockedAtPromise);
            await Promise.all(workers.map((worker) => worker.release()));
            const idx = allWorkerPools.indexOf(workerPool);
            allWorkerPools.splice(idx, 1);
        },
        // Make sure we clean up after ourselves even if a signal is caught
        async gracefulShutdown(message) {
            events.emit("pool:gracefulShutdown", { pool: this, message });
            try {
                logger.debug(`Attempting graceful shutdown`);
                // Stop new jobs being added
                active = false;
                // Release all our workers' jobs
                const workerIds = workers.map((worker) => worker.workerId);
                const jobsInProgress = workers
                    .map((worker) => worker.getActiveJob())
                    .filter((job) => !!job);
                // Remove all the workers - we're shutting them down manually
                workers.splice(0, workers.length).map((worker) => worker.release());
                logger.debug(`Releasing the jobs '${workerIds.join(", ")}'`, {
                    workerIds,
                });
                const cancelledJobs = await (0, failJob_1.failJobs)(compiledSharedOptions, withPgClient, workerIds, jobsInProgress, message);
                logger.debug(`Cancelled ${cancelledJobs.length} jobs`, {
                    cancelledJobs,
                });
                logger.debug("Jobs released");
            }
            catch (e) {
                events.emit("pool:gracefulShutdown:error", { pool: this, error: e });
                logger.error(`Error occurred during graceful shutdown: ${e.message}`, {
                    error: e,
                });
            }
            // Remove ourself from the list of worker pools
            await this.release();
        },
        promise,
    };
    // Ensure that during a forced shutdown we get cleaned up too
    allWorkerPools.push(workerPool);
    events.emit("pool:create", { workerPool });
    let attempts = 0;
    const listenForChanges = (err, client, releaseClient) => {
        if (!active) {
            // We were released, release this new client and abort
            releaseClient?.();
            return;
        }
        const reconnectWithExponentialBackoff = (err) => {
            events.emit("pool:listen:error", { workerPool, client, error: err });
            attempts++;
            // When figuring the next delay we want exponential back-off, but we also
            // want to avoid the thundering herd problem. For now, we'll add some
            // randomness to it via the `jitter` variable, this variable is
            // deliberately weighted towards the higher end of the duration.
            const jitter = 0.5 + Math.sqrt(Math.random()) / 2;
            // Backoff (ms): 136, 370, 1005, 2730, 7421, 20172, 54832
            const delay = Math.ceil(jitter * Math.min(MAX_DELAY, 50 * Math.exp(attempts)));
            logger.error(`Error with notify listener (trying again in ${delay}ms): ${err.message}`, { error: err });
            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                events.emit("pool:listen:connecting", { workerPool, attempts });
                pgPool.connect(listenForChanges);
            }, delay);
        };
        if (err) {
            // Try again
            reconnectWithExponentialBackoff(err);
            return;
        }
        //----------------------------------------
        let errorHandled = false;
        function onErrorReleaseClientAndTryAgain(e) {
            if (errorHandled) {
                return;
            }
            errorHandled = true;
            listenForChangesClient = null;
            try {
                release();
            }
            catch (e) {
                logger.error(`Error occurred releasing client: ${e.stack}`, {
                    error: e,
                });
            }
            reconnectWithExponentialBackoff(e);
        }
        function handleNotification() {
            if (listenForChangesClient === client) {
                // Find a worker that's available
                workers.some((worker) => worker.nudge());
            }
        }
        function release() {
            client.removeListener("error", onErrorReleaseClientAndTryAgain);
            client.removeListener("notification", handleNotification);
            client.query('UNLISTEN "jobs:insert"').catch(() => {
                /* ignore errors */
            });
            releaseClient();
        }
        // On error, release this client and try again
        client.on("error", onErrorReleaseClientAndTryAgain);
        //----------------------------------------
        events.emit("pool:listen:success", { workerPool, client });
        listenForChangesClient = client;
        client.on("notification", handleNotification);
        // Subscribe to jobs:insert message
        client.query('LISTEN "jobs:insert"').then(() => {
            // Successful listen; reset attempts
            attempts = 0;
        }, onErrorReleaseClientAndTryAgain);
        const supportedTaskNames = Object.keys(tasks);
        logger.info(`Worker connected and looking for jobs... (task names: '${supportedTaskNames.join("', '")}')`);
    };
    // Create a client dedicated to listening for new jobs.
    events.emit("pool:listen:connecting", { workerPool, attempts });
    pgPool.connect(listenForChanges);
    // Spawn our workers; they can share clients from the pool.
    const withPgClient = (0, helpers_1.makeWithPgClientFromPool)(pgPool);
    for (let i = 0; i < concurrency; i++) {
        workers.push((0, worker_1.makeNewWorker)(options, tasks, withPgClient));
    }
    // TODO: handle when a worker shuts down (spawn a new one)
    return workerPool;
}
exports.runTaskList = runTaskList;
const runTaskListOnce = (options, tasks, client) => {
    const withPgClient = (0, helpers_1.makeWithPgClientFromClient)(client);
    const compiledSharedOptions = (0, lib_1.processSharedOptions)(options);
    const resetPromise = (0, resetLockedAt_1.resetLockedAt)(compiledSharedOptions, withPgClient);
    const finalPromise = resetPromise.then(() => {
        const worker = (0, worker_1.makeNewWorker)(options, tasks, (0, helpers_1.makeWithPgClientFromClient)(client), false);
        finalPromise["worker"] = worker;
        return worker.promise;
    });
    return finalPromise;
};
exports.runTaskListOnce = runTaskListOnce;
//# sourceMappingURL=main.js.map