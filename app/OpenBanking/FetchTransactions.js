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
async function FetchTransactions(user, BankAccount) {
    switch (BankAccount.bank) {
        case "deutschebank":
            let DB_access_token = await GetToken_1.default(user, "auth_token", BankAccount.bank);
            let responseDB = await axios_1.default.get("https://simulator-api.db.com/gw/dbapi/banking/transactions/v2?iban=" + BankAccount.iban, { headers: { Authorization: `Bearer ${DB_access_token}` } }).then((response) => { return response; })
                .catch((error) => { return error.response; });
            if (responseDB === undefined)
                return [];
            if ("code" in responseDB.data)
                return [];
            if (responseDB.data.transactions === undefined)
                return [];
            let transactionsDB = [];
            for (let [index, transaction] of responseDB.data.transactions.entries()) {
                transactionsDB.push({
                    fetch_type: transaction.amount >= 0 ? "credit" : "debit",
                    party: transaction.counterPartyName,
                    amount: transaction.amount >= 0 ? transaction.amount : transaction.amount * -1,
                    status: "1",
                    created_at: transaction.bookingDate,
                    updated_at: transaction.bookingDate
                });
            }
            return transactionsDB;
            break;
        case "rabobank":
            let RB_access_token = await GetToken_1.default(user, "auth_token", BankAccount.bank);
            let responseRB = await axios_1.default.get("https://api-sandbox.rabobank.nl/openapi/sandbox/payments/account-information/ais/accounts/" + BankAccount.resource_id + "/transactions?bookingStatus=booked", await RabobankRequestHeaderAccounts_1.default(RB_access_token))
                .then((response) => { return response; })
                .catch((error) => { return error.response; });
            console.log(responseRB.data);
            if (responseRB === undefined)
                return [];
            if ("httpCode" in responseRB.data && responseRB.data.httpCode != 200)
                return [];
            let transactionsRB = [];
            for (let [index, transaction] of responseRB.data.transactions.booked.entries()) {
                transactionsRB.push({
                    fetch_type: transaction.transactionAmount.amount >= 0 ? "credit" : "debit",
                    party: transaction.transactionAmount.amount >= 0 ? transaction.debtorName ? transaction.debtorName : "NONAME" : transaction.creditorName ? transaction.creditorName : "NONAME",
                    amount: transaction.transactionAmount.amount >= 0 ? transaction.transactionAmount.amount : transaction.transactionAmount.amount * -1,
                    status: "1",
                    created_at: transaction.bookingDate,
                    updated_at: transaction.bookingDate
                });
            }
            return transactionsRB;
            break;
        default:
            let auth_token = await GetToken_1.default(user, "auth_token", "Neonomics");
            let sessionId = await GetToken_1.default(user, "sessionId", BankAccount.bank);
            let responseN = await axios_1.default.get("https://sandbox.neonomics.io/ics/v3/accounts/" + BankAccount.resource_id + "/transactions", { headers: { Authorization: `Bearer ${auth_token}`,
                    Accept: `application/json`, "x-device-id": "PayMe-" + user.id,
                    "x-psu-ip-address": IPADDRESS, "x-session-id": sessionId,
                    "x-psu-id": DBN_SSN_ENCRYPTED
                } }).then((response) => {
                return response;
            }).catch((error) => {
                return error.response;
            });
            if (responseN === undefined)
                return [];
            if ("errorCode" in responseN.data)
                return [];
            let transactionsN = [];
            for (let [index, transaction] of responseN.data.entries()) {
                transactionsN.push({
                    fetch_type: transaction.creditDebitIndicator === "CRDT" ? "credit" : "debit",
                    party: "NONAME",
                    amount: transaction.transactionAmount.amount,
                    status: "1",
                    created_at: transaction.bookingDate,
                    updated_at: transaction.bookingDate
                });
            }
            return transactionsN;
            break;
    }
}
exports.default = FetchTransactions;
//# sourceMappingURL=FetchTransactions.js.map