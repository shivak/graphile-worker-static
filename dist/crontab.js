"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCronItem = exports.parseCronItems = exports.parseCrontab = exports.parseCrontabLine = void 0;
const JSON5 = require("json5");
const querystring_1 = require("querystring");
const cronConstants_1 = require("./cronConstants");
const cronMatcher_1 = require("./cronMatcher");
const interfaces_1 = require("./interfaces");
/**
 * Returns a period of time in milliseconds representing the time phrase given.
 *
 * Time phrases are comprised of a sequence of number-letter combinations,
 * where the number represents a quantity and the letter represents a time
 * period, e.g.  `5d` for `five days`, or `3h` for `three hours`; e.g.
 * `4w3d2h1m` represents `four weeks, three days, 2 hours and 1 minute` (i.e. a
 * period of 44761 minutes).  The following time periods are supported:
 *
 * - `s` - one second (1000 milliseconds)
 * - `m` - one minute (60 seconds)
 * - `h` - one hour (60 minutes)
 * - `d` - on day (24 hours)
 * - `w` - one week (7 days)
 */
const parseTimePhrase = (timePhrase) => {
    let remaining = timePhrase;
    let milliseconds = 0;
    while (remaining.length) {
        const matches = cronConstants_1.TIMEPHRASE_PART.exec(remaining);
        if (!matches) {
            throw new Error(`Invalid time phrase '${timePhrase}', did not understand '${remaining}'`);
        }
        const [wholeMatch, quantity, period] = matches;
        const periodDuration = cronConstants_1.PERIOD_DURATIONS[period] || 0;
        milliseconds += parseInt(quantity, 10) * periodDuration;
        remaining = remaining.slice(wholeMatch.length);
    }
    return milliseconds;
};
const parseCrontabOptions = (lineNumber, optionsString) => {
    const parsed = optionsString != null ? (0, querystring_1.parse)(optionsString) : {};
    let backfillPeriod = undefined;
    let maxAttempts = undefined;
    let identifier = undefined;
    let queueName = undefined;
    let priority = undefined;
    const matchers = {
        id: [
            cronConstants_1.CRONTAB_OPTIONS_ID,
            (matches) => {
                identifier = matches[1];
            },
        ],
        fill: [
            cronConstants_1.CRONTAB_OPTIONS_BACKFILL,
            (matches) => {
                backfillPeriod = parseTimePhrase(matches[1]);
            },
        ],
        max: [
            cronConstants_1.CRONTAB_OPTIONS_MAX,
            (matches) => {
                maxAttempts = parseInt(matches[1], 10);
            },
        ],
        queue: [
            cronConstants_1.CRONTAB_OPTIONS_QUEUE,
            (matches) => {
                queueName = matches[1];
            },
        ],
        priority: [
            cronConstants_1.CRONTAB_OPTIONS_PRIORITY,
            (matches) => {
                priority = parseInt(matches[1], 10);
            },
        ],
    };
    function match(matcher, key, value) {
        const [regex, set] = matcher;
        const matches = regex.exec(value);
        if (matches) {
            set(matches);
        }
        else {
            throw new Error(`Options on line ${lineNumber} of crontab contains invalid value for '${key}', value '${value}' is not compatible with this option.`);
        }
    }
    Object.entries(parsed).forEach(([key, value]) => {
        if (typeof value !== "string") {
            throw new Error(`Options on line ${lineNumber} of crontab contains invalid value for '${key}', did you specify it more than once?`);
        }
        const matcher = Object.prototype.hasOwnProperty.call(matchers, key)
            ? matchers[key]
            : null;
        if (matcher) {
            match(matcher, key, value);
        }
        else {
            throw new Error(`Options on line ${lineNumber} of crontab contains unsupported key '${key}'; supported keys are: '${Object.keys(matchers).join("', '")}'.`);
        }
    });
    if (!backfillPeriod) {
        backfillPeriod = 0;
    }
    return {
        options: { backfillPeriod, maxAttempts, queueName, priority },
        identifier,
    };
};
const parseCrontabPayload = (lineNumber, payloadString) => {
    if (!payloadString) {
        return null;
    }
    try {
        return JSON5.parse(payloadString);
    }
    catch (e) {
        throw new Error(`Failed to parse JSON5 payload on line ${lineNumber} of crontab: ${e.message}`);
    }
};
const parseCrontabCommand = (lineNumber, command) => {
    const matches = cronConstants_1.CRONTAB_COMMAND.exec(command);
    if (!matches) {
        throw new Error(`Invalid command specification in line ${lineNumber} of crontab.`);
    }
    const [, task, optionsString, payloadString] = matches;
    const { options, identifier = task } = parseCrontabOptions(lineNumber, optionsString);
    const payload = parseCrontabPayload(lineNumber, payloadString);
    return { task, options, payload, identifier };
};
/**
 * Parses a line from a crontab file, such as `* * * * * my_task`
 */
const parseCrontabLine = (crontabLine, lineNumber) => {
    const matches = cronConstants_1.CRONTAB_LINE_PARTS.exec(crontabLine);
    if (!matches) {
        throw new Error(`Could not process line '${lineNumber}' of crontab: '${crontabLine}'`);
    }
    const match = (0, cronMatcher_1.createCronMatcherFromRanges)(matches, `line ${lineNumber} of crontab`);
    const { task, options, payload, identifier } = parseCrontabCommand(lineNumber, matches[6]);
    return {
        [interfaces_1.$$isParsed]: true,
        match,
        task,
        options,
        payload,
        identifier,
    };
};
exports.parseCrontabLine = parseCrontabLine;
const parseCrontab = (crontab) => {
    const lines = crontab.split(/\r?\n/);
    const items = [];
    for (let lineNumber = 1, numberOfLines = lines.length; lineNumber <= numberOfLines; lineNumber++) {
        const line = lines[lineNumber - 1].trim();
        if (line.startsWith("#") || line === "") {
            // Ignore comment lines and empty lines
            continue;
        }
        items.push((0, exports.parseCrontabLine)(line, lineNumber));
    }
    // Assert that identifiers are unique
    const identifiers = items.map((i) => i.identifier);
    identifiers.sort();
    const duplicates = identifiers.filter((id, i) => i > 0 && id === identifiers[i - 1]);
    if (duplicates.length) {
        throw new Error(`Invalid crontab; duplicate identifiers found: '${duplicates.join("', '")}' - please use '?id=...' to specify unique identifiers for your cron items`);
    }
    return items;
};
exports.parseCrontab = parseCrontab;
/**
 * Parses a list of `CronItem`s into a list of `ParsedCronItem`s, ensuring the
 * results comply with all the expectations of the `ParsedCronItem` type
 * (including those that cannot be encoded in TypeScript).
 */
const parseCronItems = (items) => {
    return items.map((item, idx) => (0, exports.parseCronItem)(item, `item ${idx} of parseCronItems call`));
};
exports.parseCronItems = parseCronItems;
/**
 * Parses an individual `CronItem` into a `ParsedCronItem`, ensuring the
 * results comply with all the expectations of the `ParsedCronItem` type
 * (including those that cannot be encoded in TypeScript).
 */
const parseCronItem = (cronItem, source = "parseCronItem call") => {
    const { match: rawMatch, task, options = {}, payload = {}, identifier = task, } = cronItem;
    if (cronItem.pattern) {
        throw new Error("Please rename the 'pattern' property to 'match'");
    }
    const match = typeof rawMatch === "string"
        ? (0, cronMatcher_1.createCronMatcher)(rawMatch, source)
        : rawMatch;
    if (typeof match !== "function") {
        throw new Error("Invalid 'match' configuration");
    }
    return {
        [interfaces_1.$$isParsed]: true,
        match,
        task,
        options,
        payload,
        identifier,
    };
};
exports.parseCronItem = parseCronItem;
//# sourceMappingURL=crontab.js.map