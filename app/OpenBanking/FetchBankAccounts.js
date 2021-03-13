"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const IPADDRESS = "109.74.179.3";
const DBN_SSN_ENCRYPTED = "ARxbvsVFZnYiYrkVCDOn1AE0EY955HQVMZwSOdV0eSg7QQ2kzfVIlY7Hr/D3";
async function GetBankAccounts(user, Bank) {
    switch (Bank) {
        case "deutschebank":
            let DB_access_token = await GetToken_1.default(user, "access_token", Bank);
            return await axios_1.default.get("https://simulator-api.db.com/gw/dbapi/v1/cashAccounts", { headers: { Authorization: `Bearer ${DB_access_token}` } }).then((response) => { return response.data; })
                .catch((error) => { return error.response.data; });
            break;
        case "rabobank":
            const { uuidv4 } = require('uuidv4');
            const crypto = require('crypto');
            var hashDigest = crypto.createHmac('sha512');
            hashDigest.update({});
            let digest = Buffer.from(hashDigest.digest('binary')).toString('base64');
            let requestId = uuidv4();
            let requestDate = new Date().toUTCString();
            console.log({
                date: requestDate,
                digest: digest,
                'x-request-id': requestId
            });
            var hashSigning = crypto.createHmac('sha512');
            hashSigning.update({
                date: requestDate,
                digest: digest,
                'x-request-id': requestId
            });
            let signing = Buffer.from(hashSigning.digest('binary')).toString('base64');
            let RB_access_token = await GetToken_1.default(user, "access_token", Bank);
            return await axios_1.default.get("https://api-sandbox.rabobank.nl/openapi/sandbox/payments/account-information/ais/accounts", { headers: {
                    Authorization: `Bearer ${RB_access_token}`,
                    accept: `application/json`,
                    date: `${requestDate}`,
                    "x-request-id": requestId,
                    "tpp-signature-certificate": process.env.rabobank_signing_cer,
                    "x-ibm-client-id": process.env.rabobank_client,
                    digest: `sha-512=${digest}`,
                    signature: `${signing}`,
                } }).then((response) => { return response.data; })
                .catch((error) => { return error.response.data; });
            break;
        default:
            let auth_token = await GetToken_1.default(user, "auth_token", "Neonomics");
            let sessionId = await GetToken_1.default(user, "sessionId", Bank);
            return await axios_1.default.get("https://sandbox.neonomics.io/ics/v3/accounts", { headers: { Authorization: `Bearer ${auth_token}`,
                    Accept: `application/json`, "x-device-id": "PayMe-" + user.id,
                    "x-psu-ip-address": IPADDRESS, "x-session-id": sessionId,
                    "x-psu-id": DBN_SSN_ENCRYPTED
                } }).then((response) => {
                return response.data;
            }).catch((error) => {
                return error.response.data;
            });
            break;
    }
}
exports.default = GetBankAccounts;
//# sourceMappingURL=FetchBankAccounts.js.map