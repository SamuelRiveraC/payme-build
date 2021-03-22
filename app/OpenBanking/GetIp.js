"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function GetIp() {
    const ip = require('ip');
    return ip.address();
}
exports.default = GetIp;
//# sourceMappingURL=GetIp.js.map