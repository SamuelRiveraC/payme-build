"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const RabobankRequestHeaderAccounts_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/RabobankRequestHeaderAccounts"));
const IPADDRESS = "109.74.179.3";
const crypto = require('crypto');
const iv = crypto.randomBytes(12);
const ssn = "31125461118";
const key = Buffer.from(process.env.neonomics_raw_key, 'base64');
const cipher = crypto.createCipheriv('aes-128-gcm', key, iv, { authTagLength: 16 });
let enc = Buffer.concat([cipher.update(ssn), cipher.final(), cipher.getAuthTag()]);
const DBN_SSN_ENCRYPTED = Buffer.concat([iv, enc]).toString('base64');
async function GetBankAccounts(user, Bank) {
    switch (Bank) {
        case "deutschebank":
            let DB_access_token = await GetToken_1.default(user, "auth_token", Bank);
            let responseDB = await axios_1.default.get("https://simulator-api.db.com/gw/dbapi/v1/cashAccounts", { headers: { Authorization: `Bearer ${DB_access_token}` } }).then((response) => { return response; })
                .catch((error) => { return error.response; });
            if (responseDB === undefined)
                return { error: 504, message: "We couldn't fetch the bank accounts, please try again" };
            if ("errorCode" in responseDB.data)
                return { error: 500, message: responseDB.data.errorCode + ": " + responseDB.data.message };
            return responseDB.data;
            break;
        case "rabobank":
            let RB_access_token = await GetToken_1.default(user, "auth_token", Bank);
            let responseRB = await axios_1.default.get("https://api-sandbox.rabobank.nl/openapi/sandbox/payments/account-information/ais/accounts", await RabobankRequestHeaderAccounts_1.default(RB_access_token))
                .then((response) => { return response; })
                .catch((error) => { return error.response; });
            if (responseRB === undefined)
                return { error: 504, message: "We couldn't fetch the bank accounts, please try again" };
            if ("errorCode" in responseRB.data)
                return { error: 500, message: responseRB.data.errorCode + ": " + responseRB.data.message };
            let bankAccounts = responseRB.data.accounts;
            for (const account of bankAccounts) {
                let accountBalance = await axios_1.default.get("https://api-sandbox.rabobank.nl/openapi/sandbox/payments/account-information/ais/accounts/" + account.resourceId + "/balances", await RabobankRequestHeaderAccounts_1.default(RB_access_token))
                    .then((response) => { return response.data; })
                    .catch((error) => { return error.response.data; });
                account.balance = accountBalance.balances[0].balanceAmount;
            }
            return bankAccounts;
            break;
        default:
            let auth_token = await GetToken_1.default(user, "auth_token", "Neonomics");
            let sessionId = await GetToken_1.default(user, "sessionId", Bank);
            console.log(auth_token, sessionId);
            let responseN = await axios_1.default.get("https://sandbox.neonomics.io/ics/v3/accounts", { headers: { Authorization: `Bearer ${auth_token}`,
                    Accept: `application/json`, "x-device-id": "PayMe-" + user.id,
                    "x-psu-ip-address": IPADDRESS, "x-session-id": sessionId,
                    "x-psu-id": DBN_SSN_ENCRYPTED
                } }).then((response) => {
                return response;
            }).catch((error) => {
                return error.response;
            });
            if (responseN === undefined)
                return { error: 504, message: "We couldn't fetch the bank accounts, please try again" };
            if ("errorCode" in responseN.data)
                return { error: 500, message: responseN.data.errorCode + ": " + responseN.data.message };
            return responseN.data;
            break;
    }
}
exports.default = GetBankAccounts;
//# sourceMappingURL=FetchBankAccounts.js.map