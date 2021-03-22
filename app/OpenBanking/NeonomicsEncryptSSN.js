"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
async function NeonomicsEncryptSSN(SSN) {
    const iv = crypto_1.default.randomBytes(12);
    const key = Buffer.from(process.env.neonomics_raw_key, 'base64');
    const cipher = crypto_1.default.createCipheriv('aes-128-gcm', key, iv, { authTagLength: 16 });
    const enc = Buffer.concat([cipher.update(SSN), cipher.final(), cipher.getAuthTag()]);
    return Buffer.concat([iv, enc]).toString('base64');
}
exports.default = NeonomicsEncryptSSN;
//# sourceMappingURL=NeonomicsEncryptSSN.js.map