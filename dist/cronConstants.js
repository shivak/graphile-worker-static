"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERIOD_DURATIONS = exports.TIMEPHRASE_PART = exports.CRONTAB_OPTIONS_PRIORITY = exports.CRONTAB_OPTIONS_QUEUE = exports.CRONTAB_OPTIONS_MAX = exports.CRONTAB_OPTIONS_BACKFILL = exports.CRONTAB_OPTIONS_ID = exports.CRONTAB_COMMAND = exports.CRONTAB_WILDCARD = exports.CRONTAB_RANGE = exports.CRONTAB_NUMBER = exports.CRONTAB_TIME_PARTS = exports.CRONTAB_LINE_PARTS = exports.WEEK = exports.DAY = exports.HOUR = exports.MINUTE = exports.SECOND = void 0;
/** One second in milliseconds */
exports.SECOND = 1000;
/** One minute in milliseconds */
exports.MINUTE = 60 * exports.SECOND;
/** One hour in milliseconds */
exports.HOUR = 60 * exports.MINUTE;
/** One day in milliseconds */
exports.DAY = 24 * exports.HOUR;
/** One week in milliseconds */
exports.WEEK = 7 * exports.DAY;
// A (non-comment, non-empty) line in the crontab file
/** Separates crontab line into the minute, hour, day of month, month, day of week and command parts. */
exports.CRONTAB_LINE_PARTS = /^([0-9*/,-]+)\s+([0-9*/,-]+)\s+([0-9*/,-]+)\s+([0-9*/,-]+)\s+([0-9*/,-]+)\s+(.*)$/;
/** Just the time expression from CRONTAB_LINE_PARTS */
exports.CRONTAB_TIME_PARTS = /^([0-9*/,-]+)\s+([0-9*/,-]+)\s+([0-9*/,-]+)\s+([0-9*/,-]+)\s+([0-9*/,-]+)$/;
// Crontab ranges from the minute, hour, day of month, month and day of week parts of the crontab line
/** Matches an explicit numeric value */
exports.CRONTAB_NUMBER = /^([0-9]+)$/;
/** Matches a range of numeric values */
exports.CRONTAB_RANGE = /^([0-9]+)-([0-9]+)$/;
/** Matches a numeric wildcard, optionally with a divisor */
exports.CRONTAB_WILDCARD = /^\*(?:\/([0-9]+))?$/;
// The command from the crontab line
/** Splits the command from the crontab line into the task, options and payload. */
exports.CRONTAB_COMMAND = /^([_a-zA-Z][_a-zA-Z0-9:_-]*)(?:\s+\?([^\s]+))?(?:\s+(\{.*\}))?$/;
// Crontab command options
/** Matches the id=UID option, capturing the unique identifier */
exports.CRONTAB_OPTIONS_ID = /^([_a-zA-Z][-_a-zA-Z0-9]*)$/;
/** Matches the fill=t option, capturing the time phrase  */
exports.CRONTAB_OPTIONS_BACKFILL = /^((?:[0-9]+[smhdw])+)$/;
/** Matches the max=n option, capturing the max executions number */
exports.CRONTAB_OPTIONS_MAX = /^([0-9]+)$/;
/** Matches the queue=name option, capturing the queue name */
exports.CRONTAB_OPTIONS_QUEUE = /^([-a-zA-Z0-9_:]+)$/;
/** Matches the priority=n option, capturing the priority value */
exports.CRONTAB_OPTIONS_PRIORITY = /^(-?[0-9]+)$/;
/** Matches the quantity and period string at the beginning of a timephrase */
exports.TIMEPHRASE_PART = /^([0-9]+)([smhdw])/;
exports.PERIOD_DURATIONS = {
    s: exports.SECOND,
    m: exports.MINUTE,
    h: exports.HOUR,
    d: exports.DAY,
    w: exports.WEEK,
};
//# sourceMappingURL=cronConstants.js.map