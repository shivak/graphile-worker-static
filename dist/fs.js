"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryStat = exports.readdir = exports.readFile = exports.stat = void 0;
const rawFs = require("fs");
const util_1 = require("util");
exports.stat = (0, util_1.promisify)(rawFs.stat);
exports.readFile = (0, util_1.promisify)(rawFs.readFile);
exports.readdir = (0, util_1.promisify)(rawFs.readdir);
async function tryStat(pathToStat) {
    try {
        return await (0, exports.stat)(pathToStat);
    }
    catch (e) {
        return null;
    }
}
exports.tryStat = tryStat;
//# sourceMappingURL=fs.js.map