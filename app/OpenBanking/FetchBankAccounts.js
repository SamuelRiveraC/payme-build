"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const RabobankRequestHeaderAccounts_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/RabobankRequestHeaderAccounts"));
const NeonomicsUniqueId_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/NeonomicsUniqueId"));
const GetIp_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetIp"));
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
            let neonomicsAuthToken = await GetToken_1.default(user, "auth_token", "Neonomics");
            let neonomicsSessionId = await GetToken_1.default(user, "sessionId", Bank);
            let responseN = await axios_1.default.get("https://sandbox.neonomics.io/ics/v3/accounts", { headers: {
                    "Authorization": `Bearer ${neonomicsAuthToken}`,
                    "x-session-id": neonomicsSessionId,
                    "x-device-id": await NeonomicsUniqueId_1.default(user),
                    "Accept": `application/json`,
                    "Content-Type": "application/json",
                    "x-psu-ip-address": await GetIp_1.default(),
                    "x-redirect-url": process.env.APP_URL + "add-account/neonomics/",
                } }).then((response) => {
                return response;
            }).catch((error) => {
                return error.response;
            });
            console.log("3 - NEONOMICS: Getting Bank Account for real ", Bank, neonomicsSessionId);
            if (responseN === undefined)
                return { error: 504, message: "We couldn't fetch the bank accounts, please try again" };
            if ("errorCode" in responseN.data)
                return { error: 500, message: responseN.data.errorCode + ": " + responseN.data.message };
            console.log(JSON.stringify(responseN.data));
            return responseN.data;
            break;
    }
}
exports.default = GetBankAccounts;
//# sourceMappingURL=FetchBankAccounts.js.map