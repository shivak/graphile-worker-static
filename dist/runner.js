"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.runOnce = exports.runMigrations = void 0;
const assert = require("assert");
const cron_1 = require("./cron");
const getTasks_1 = require("./getTasks");
const lib_1 = require("./lib");
const main_1 = require("./main");
const migrate_1 = require("./migrate");
const runMigrations = async (options) => {
    const { withPgClient, release } = await (0, lib_1.getUtilsAndReleasersFromOptions)(options);
    try {
        await withPgClient((client) => (0, migrate_1.migrate)(options, client));
    }
    finally {
        await release();
    }
};
exports.runMigrations = runMigrations;
async function assertTaskList(options, releasers) {
    assert(!options.taskDirectory || !options.taskList, "Exactly one of either `taskDirectory` or `taskList` should be set");
    if (options.taskList) {
        return options.taskList;
    }
    else if (options.taskDirectory) {
        const watchedTasks = await (0, getTasks_1.default)(options, options.taskDirectory, false);
        releasers.push(() => watchedTasks.release());
        return watchedTasks.tasks;
    }
    else {
        throw new Error("You must specify either `options.taskList` or `options.taskDirectory`");
    }
}
const runOnce = async (options, overrideTaskList) => {
    const { concurrency = 1 } = options;
    const { withPgClient, release, releasers } = await (0, lib_1.getUtilsAndReleasersFromOptions)(options);
    try {
        const taskList = overrideTaskList || (await assertTaskList(options, releasers));
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(withPgClient((client) => (0, main_1.runTaskListOnce)(options, taskList, client)));
        }
        await Promise.all(promises);
    }
    finally {
        await release();
    }
};
exports.runOnce = runOnce;
const run = async (options, overrideTaskList, overrideParsedCronItems) => {
    const compiledOptions = await (0, lib_1.getUtilsAndReleasersFromOptions)(options);
    const { release, releasers } = compiledOptions;
    try {
        const taskList = overrideTaskList || (await assertTaskList(options, releasers));
        const parsedCronItems = overrideParsedCronItems ||
            (await (0, cron_1.getParsedCronItemsFromOptions)(options, releasers));
        // The result of 'buildRunner' must be returned immediately, so that the
        // user can await its promise property immediately. If this is broken then
        // unhandled promise rejections could occur in some circumstances, causing
        // a process crash in Node v16+.
        return buildRunner({
            options,
            compiledOptions,
            taskList,
            parsedCronItems,
        });
    }
    catch (e) {
        await release();
        throw e;
    }
};
exports.run = run;
/**
 * This _synchronous_ function exists to ensure that the promises are built and
 * returned synchronously, such that an unhandled promise rejection error does
 * not have time to occur.
 *
 * @internal
 */
function buildRunner(input) {
    const { options, compiledOptions, taskList, parsedCronItems } = input;
    const { events, pgPool, releasers, release, addJob } = compiledOptions;
    const cron = (0, cron_1.runCron)(options, parsedCronItems, { pgPool, events });
    releasers.push(() => cron.release());
    const workerPool = (0, main_1.runTaskList)(options, taskList, pgPool);
    releasers.push(() => workerPool.release());
    let running = true;
    const stop = async () => {
        if (running) {
            running = false;
            events.emit("stop", {});
            await release();
        }
        else {
            throw new Error("Runner is already stopped");
        }
    };
    const promise = Promise.all([cron.promise, workerPool.promise]).then(() => {
        /* void */
    }, (e) => {
        if (running) {
            console.error(`Stopping worker due to an error: ${e}`);
            stop();
        }
        else {
            console.error(`Error occurred, but worker is already stopping: ${e}`);
        }
        return Promise.reject(e);
    });
    return {
        stop,
        addJob,
        promise,
        events,
    };
}
//# sourceMappingURL=runner.js.map