"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const RabobankRequestHeaderAccounts_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/RabobankRequestHeaderAccounts"));
const NeonomicsUniqueId_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/NeonomicsUniqueId"));
const NeonomicsEncryptSSN_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/NeonomicsEncryptSSN"));
const GetIp_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetIp"));
async function FetchTransactions(user, BankAccount) {
    switch (BankAccount.bank) {
        case "deutschebank":
            let DB_access_token = await GetToken_1.default(user, "auth_token", BankAccount.bank);
            let responseDB = await axios_1.default.get("https://simulator-api.db.com:443/gw/dbapi/banking/transactions/v2/?iban=" + BankAccount.iban + "&sortBy=bookingDate%5BDESC%5D&limit=10&offset=0", { headers: { Authorization: `Bearer ${DB_access_token}` } }).then((response) => { return response; })
                .catch((error) => { return error.response; });
            if (responseDB.data === undefined)
                return [];
            if ("code" in responseDB.data)
                return [];
            if (responseDB.data.transactions === undefined)
                return [];
            let transactionsDB = [];
            for (let [index, transaction] of responseDB.data.transactions.entries()) {
                let fetch_type = "credit";
                if (transaction.paymentIdentification === "XYZ") {
                    fetch_type = transaction.amount >= 0 ? "credit" : "debit";
                }
                else {
                    fetch_type = transaction.amount <= 0 ? "credit" : "debit";
                }
                console.log("Deutschebank " + transaction.bookingDate + `T0${index}:00:000Z`);
                transactionsDB.push({
                    fetch_type: fetch_type,
                    uuid: transaction.paymentIdentification.replace("RTE", ""),
                    party: transaction.counterPartyName,
                    amount: transaction.amount >= 0 ? transaction.amount : transaction.amount * -1,
                    status: "1",
                    created_at: new Date(transaction.bookingDate + ` 0${index}:00:000Z`).getTime(),
                    updated_at: new Date(transaction.bookingDate + ` 0${index}:00:000Z`).getTime(),
                    color: "0018a8"
                });
            }
            return transactionsDB;
            break;
        case "rabobank":
            let RB_access_token = await GetToken_1.default(user, "auth_token", BankAccount.bank);
            let responseRB = await axios_1.default.get("https://api-sandbox.rabobank.nl/openapi/sandbox/payments/account-information/ais/accounts/" + BankAccount.resource_id + "/transactions?bookingStatus=booked&size=10", await RabobankRequestHeaderAccounts_1.default(RB_access_token))
                .then((response) => { return response; })
                .catch((error) => { return error.response; });
            if (responseRB === undefined)
                return [];
            if ("httpCode" in responseRB.data && responseRB.data.httpCode != 200)
                return [];
            let transactionsRB = [];
            for (let [index, transaction] of responseRB.data.transactions.booked.entries()) {
                console.log("Rabobank " + transaction.raboBookingDateTime);
                transactionsRB.push({
                    fetch_type: transaction.transactionAmount.amount >= 0 ? "credit" : "debit",
                    party: transaction.transactionAmount.amount >= 0 ? transaction.debtorName ? transaction.debtorName : "NONAME" : transaction.creditorName ? transaction.creditorName : "NONAME",
                    amount: transaction.transactionAmount.amount >= 0 ? transaction.transactionAmount.amount : transaction.transactionAmount.amount * -1,
                    status: "1",
                    created_at: new Date(transaction.raboBookingDateTime).getTime(),
                    updated_at: new Date(transaction.raboBookingDateTime).getTime(),
                    color: "FF6600"
                });
            }
            return transactionsRB;
            break;
        default:
            let auth_token = await GetToken_1.default(user, "auth_token", "Neonomics");
            let sessionId = await GetToken_1.default(user, "sessionId", BankAccount.bank);
            let responseN = await axios_1.default.get("https://sandbox.neonomics.io/ics/v3/accounts/" + BankAccount.resource_id + "/transactions", { headers: { Authorization: `Bearer ${auth_token}`,
                    Accept: `application/json`,
                    "x-device-id": await NeonomicsUniqueId_1.default(user),
                    "x-session-id": sessionId,
                    "x-psu-ip-address": await GetIp_1.default(),
                    "x-psu-id": BankAccount.bank === "DNB" ? await NeonomicsEncryptSSN_1.default("31125461118") : null
                } }).then((response) => {
                return response;
            }).catch((error) => {
                return error.response;
            });
            if (responseN === undefined)
                return [];
            if ("errorCode" in responseN.data)
                return [];
            let transactionsUnformatted = responseN.data.entries();
            let transactionsN = [];
            for (let [index, transaction] of transactionsUnformatted) {
                console.log("Neonomics " + transaction.bookingDate);
                transactionsN.push({
                    fetch_type: transaction.creditDebitIndicator === "CRDT" ? "credit" : "debit",
                    party: transaction.transactionReference,
                    amount: transaction.transactionAmount.value,
                    status: "1",
                    created_at: new Date(transaction.bookingDate).getTime(),
                    updated_at: new Date(transaction.bookingDate).getTime(),
                    color: "1F69E5"
                });
            }
            console.log(transactionsN.slice(0, 10));
            return transactionsN.slice(0, 10);
            break;
    }
}
exports.default = FetchTransactions;
//# sourceMappingURL=FetchTransactions.js.map