"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$$isParsed = exports.isValidTask = void 0;
function isValidTask(fn) {
    if (typeof fn === "function") {
        return true;
    }
    return false;
}
exports.isValidTask = isValidTask;
/**
 * Symbol to determine that the item was indeed fed through a parser function.
 *
 * @internal
 */
exports.$$isParsed = Symbol("isParsed");
//# sourceMappingURL=interfaces.js.map