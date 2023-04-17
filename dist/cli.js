#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const config_1 = require("./config");
const getCronItems_1 = require("./getCronItems");
const getTasks_1 = require("./getTasks");
const index_1 = require("./index");
const runner_1 = require("./runner");
const argv_ = yargs
    .parserConfiguration({
    "boolean-negation": false,
})
    .option("connection", {
    description: "Database connection string, defaults to the 'DATABASE_URL' envvar",
    alias: "c",
})
    .string("connection")
    .option("schema", {
    description: "The database schema in which Graphile Worker is (to be) located",
    alias: "s",
    default: config_1.defaults.schema,
})
    .string("schema")
    .option("schema-only", {
    description: "Just install (or update) the database schema, then exit",
    default: false,
})
    .boolean("schema-only")
    .option("once", {
    description: "Run until there are no runnable jobs left, then exit",
    default: false,
})
    .boolean("once")
    .option("watch", {
    description: "[EXPERIMENTAL] Watch task files for changes, automatically reloading the task code without restarting worker",
    alias: "w",
    default: false,
})
    .boolean("watch")
    .option("crontab", {
    description: "override path to crontab file",
})
    .string("crontab")
    .option("jobs", {
    description: "number of jobs to run concurrently",
    alias: "j",
    default: config_1.defaults.concurrentJobs,
})
    .number("jobs")
    .option("max-pool-size", {
    description: "maximum size of the PostgreSQL pool",
    alias: "m",
    default: 10,
})
    .number("max-pool-size")
    .option("poll-interval", {
    description: "how long to wait between polling for jobs in milliseconds (for jobs scheduled in the future/retries)",
    default: config_1.defaults.pollInterval,
})
    .number("poll-interval")
    .option("no-prepared-statements", {
    description: "set this flag if you want to disable prepared statements, e.g. for compatibility with pgBouncer",
    default: false,
})
    .boolean("no-prepared-statements")
    .strict(true).argv;
function isPromise(val) {
    return typeof val === "object" && val && typeof val.then === "function";
}
// Hack TypeScript to stop whinging about argv potentially being a promise
if (isPromise(argv_)) {
    throw new Error("yargs returned a promise");
}
const argv = argv_;
const isInteger = (n) => {
    return isFinite(n) && Math.round(n) === n;
};
async function main() {
    const DATABASE_URL = argv.connection || process.env.DATABASE_URL || undefined;
    const SCHEMA = argv.schema || undefined;
    const ONCE = argv.once;
    const SCHEMA_ONLY = argv["schema-only"];
    const WATCH = argv.watch;
    if (SCHEMA_ONLY && WATCH) {
        throw new Error("Cannot specify both --watch and --schema-only");
    }
    if (SCHEMA_ONLY && ONCE) {
        throw new Error("Cannot specify both --once and --schema-only");
    }
    if (WATCH && ONCE) {
        throw new Error("Cannot specify both --watch and --once");
    }
    if (!DATABASE_URL && !process.env.PGDATABASE) {
        throw new Error("Please use `--connection` flag, set `DATABASE_URL` or `PGDATABASE` envvars to indicate the PostgreSQL connection to use.");
    }
    const options = {
        schema: SCHEMA || config_1.defaults.schema,
        concurrency: isInteger(argv.jobs) ? argv.jobs : config_1.defaults.concurrentJobs,
        maxPoolSize: isInteger(argv["max-pool-size"])
            ? argv["max-pool-size"]
            : config_1.defaults.maxPoolSize,
        pollInterval: isInteger(argv["poll-interval"])
            ? argv["poll-interval"]
            : config_1.defaults.pollInterval,
        connectionString: DATABASE_URL,
        noPreparedStatements: !!argv["no-prepared-statements"],
    };
    if (SCHEMA_ONLY) {
        await (0, runner_1.runMigrations)(options);
        console.log("Schema updated");
        return;
    }
    const watchedTasks = await (0, getTasks_1.default)(options, `${process.cwd()}/tasks`, WATCH);
    const watchedCronItems = await (0, getCronItems_1.default)(options, argv.crontab || `${process.cwd()}/crontab`, WATCH);
    if (ONCE) {
        await (0, index_1.runOnce)(options, watchedTasks.tasks);
    }
    else {
        const { promise } = await (0, index_1.run)(options, watchedTasks.tasks, watchedCronItems.items);
        // Continue forever(ish)
        await promise;
    }
}
main().catch((e) => {
    console.error(e); // eslint-disable-line no-console
    process.exit(1);
});
//# sourceMappingURL=cli.js.map