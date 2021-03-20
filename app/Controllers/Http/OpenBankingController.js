"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/User"));
const Transaction_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/Transaction"));
const BankAccount_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/BankAccount"));
const FetchAuthToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchAuthToken"));
const FetchAccessToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchAccessToken"));
const FetchBankAccounts_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchBankAccounts"));
const MakePayment_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/MakePayment"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const Database_1 = __importDefault(global[Symbol.for('ioc.use')]("Adonis/Lucid/Database"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const RabobankRequestHeaderTransaction_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/RabobankRequestHeaderTransaction"));
const IPADDRESS = "109.74.179.3";
const crypto = require('crypto');
const iv = crypto.randomBytes(12);
const ssn = "31125461118";
const key = Buffer.from(process.env.neonomics_raw_key, 'base64');
const cipher = crypto.createCipheriv('aes-128-gcm', key, iv, { authTagLength: 16 });
let enc = Buffer.concat([cipher.update(ssn), cipher.final(), cipher.getAuthTag()]);
const DBN_SSN_ENCRYPTED = Buffer.concat([iv, enc]).toString('base64');
class OpenBankingController {
    async OAuthAuth({ auth, request, response }) {
        const user = await auth.authenticate();
        const bank = request.input("bank");
        const code = request.input("code");
        let AuthToken = await FetchAuthToken_1.default(user, bank, code);
        if ("error" in AuthToken) {
            return response.status(AuthToken.error).send({ ...AuthToken });
        }
        else if ("auth_url" in AuthToken) {
            return { auth_url: AuthToken.auth_url };
        }
        else if ("consent_url" in AuthToken) {
            await auth.use('api').generate(user, {
                name: AuthToken.bank,
                type: "sessionId",
                token: AuthToken.sessionId,
            });
            return { consent_url: AuthToken.consent_url };
        }
        else if ("banks" in AuthToken) {
            await auth.use('api').generate(user, {
                name: "Neonomics",
                type: "auth_token",
                token: AuthToken.access_token,
                expiresIn: AuthToken.expires_in + " seconds"
            });
            await auth.use('api').generate(user, {
                name: "Neonomics",
                type: "refresh_token",
                token: AuthToken.refresh_token,
                expiresIn: AuthToken.refresh_expires_in + " seconds"
            });
            return { banks: AuthToken.banks };
        }
    }
    async OAuthAccessAndBanks({ auth, request, response }) {
        const user = await auth.authenticate();
        const bank = request.input("bank");
        const code = request.input("code");
        if ((bank == "deutschebank" || bank == "rabobank")) {
            let AccessToken = await FetchAccessToken_1.default(user, bank, code);
            await Database_1.default.from('api_tokens')
                .where('user_id', user.id)
                .andWhere('name', bank)
                .delete();
            await auth.use('api').generate(user, {
                name: bank, type: "auth_token",
                token: AccessToken.access_token,
                expiresIn: AccessToken.expires_in
            });
            await auth.use('api').generate(user, {
                name: bank, type: "refresh_token",
                token: AccessToken.refresh_token,
                expiresIn: AccessToken.refresh_token_expires_in
            });
            let GetBankAccounts = await FetchBankAccounts_1.default(user, bank);
            if ("error" in GetBankAccounts) {
                return response.status(GetBankAccounts.error).send({ ...GetBankAccounts });
            }
            else if (GetBankAccounts.length > 0) {
                await BankAccount_1.default.query().where('user_id', user.id).update({ primary: 'false' });
            }
            else {
                return response.status(GetBankAccounts.error).send({ ...GetBankAccounts });
            }
            if (bank === "deutschebank") {
                for (const [index, account] of GetBankAccounts.entries()) {
                    await BankAccount_1.default.updateOrCreate({ iban: account.iban, user_id: user.id }, {
                        bank: "deutschebank",
                        alias: `${account.productDescription} (${user.last_name})`,
                        balance: account.currentBalance,
                        bic: account.bic,
                        primary: index === 0 ? 'true' : 'false',
                    });
                }
            }
            else if (bank === "rabobank") {
                for (const [index, account] of GetBankAccounts.entries()) {
                    await BankAccount_1.default.updateOrCreate({ iban: account.iban, user_id: user.id }, {
                        resource_id: account.resourceId,
                        bank: "rabobank",
                        alias: `${account.ownerName} (${user.last_name})`,
                        balance: account.balance.amount,
                        bic: "Update Pending",
                        primary: index === 0 ? 'true' : 'false',
                    });
                }
            }
            return GetBankAccounts;
        }
        let GetBankAccounts = await FetchBankAccounts_1.default(user, bank);
        console.log("BANK ACCOUNTS:\n", JSON.stringify(GetBankAccounts));
        if ("error" in GetBankAccounts) {
            return response.status(GetBankAccounts.error).send({ ...GetBankAccounts });
        }
        else if (GetBankAccounts.length > 0) {
            await BankAccount_1.default.query().where('user_id', user.id).update({ primary: 'false' });
            for (const [index, account] of GetBankAccounts.entries()) {
                await BankAccount_1.default.updateOrCreate({ iban: account.iban, user_id: user.id }, {
                    resource_id: account.id,
                    bank: bank,
                    alias: `${account.accountName} (${user.last_name})`,
                    balance: account.balances[0].amount < 0 ? account.balances[0].amount * -1 : account.balances[0].amount,
                    bic: "Update pending",
                    primary: index === 0 ? 'true' : 'false',
                });
            }
            return GetBankAccounts;
        }
    }
    async OAuthTransactions({ auth, request, response }) {
        const transactionType = request.input("type");
        const user = await auth.authenticate();
        let counterParty = {};
        let transaction = {
            uuid: uuid_1.v4(),
            user_receiver_id: 0,
            user_sender_id: 0,
            account_sender_id: 0,
            account_receiver_id: 0,
            amount: parseFloat((parseFloat(request.input("amount")).toFixed(2))),
            status: 0
        };
        if (transactionType === "Request") {
            counterParty = await User_1.default.findOrFail(request.input("counterParty"));
            transaction.user_sender_id = counterParty.id;
            transaction.user_receiver_id = user.id;
            transaction.account_sender_id = null;
            transaction.account_receiver_id = null;
            return await MakePayment_1.default(user, counterParty, transaction, "Request");
        }
        else if (transactionType == "Payment") {
            transaction = (await Transaction_1.default.findOrFail(request.input("transaction"))).serialize();
            counterParty = await User_1.default.findOrFail(transaction.user_receiver_id);
            if (transaction.user_sender_id !== user.id)
                return response.status(400).send({ code: "E_NOT_THE_USER_TRANSACTION" });
            if (transaction.status !== 0)
                return response.status(400).send({ code: "E_ALREADY_PAID" });
        }
        else {
            if (transactionType === "User") {
                counterParty = await User_1.default.findByOrFail("slug", request.input("counterParty"));
            }
            else {
                counterParty = await User_1.default.findOrFail(request.input("counterParty"));
            }
            transaction.user_sender_id = user.id;
            transaction.user_receiver_id = counterParty.id;
        }
        if (transaction.user_receiver_id === transaction.user_sender_id)
            return response.status(400).send({ status: 400, code: "E_SAME_USER" });
        let senderAccount = await BankAccount_1.default.query().where('user_id', user.id).andWhere('primary', "true").first();
        if (senderAccount == null)
            return response.status(400).send({ status: 401, code: "E_SENDER_NO_BANK_ACCOUNT" });
        let receiverAccount = await BankAccount_1.default.query().where('user_id', counterParty.id).andWhere('primary', "true").first();
        if (receiverAccount == null)
            return response.status(400).send({ status: 401, code: "E_RECEIVER_NO_BANK_ACCOUNT" });
        if (senderAccount.balance < transaction.amount)
            return response.status(400).send({ status: 401, code: "E_INSUFFICIENT_FUNDS" });
        transaction.account_sender_id = senderAccount.id;
        transaction.account_receiver_id = receiverAccount.id;
        senderAccount.balance = senderAccount.balance - transaction.amount;
        receiverAccount.balance = receiverAccount.balance + transaction.amount;
        if (senderAccount.bank === "payme") {
            transaction.status = 1;
            let PMResponse = await MakePayment_1.default(user, counterParty, transaction);
            await senderAccount.save();
            await receiverAccount.save();
            return { bank: "payme", ...PMResponse };
        }
        else if (senderAccount.bank === "deutschebank") {
            const db_token = await GetToken_1.default(user, "auth_token", "deutschebank");
            if (!request.input("otp_auth_id") && !request.input("otp_auth_key")) {
                let OTPResponse = await axios_1.default.post("https://simulator-api.db.com:443/gw/dbapi/others/onetimepasswords/v2/single", {
                    "method": "PHOTOTAN",
                    "requestType": "INSTANT_SEPA_CREDIT_TRANSFERS",
                    "requestData": {
                        type: "challengeRequestDataInstantSepaCreditTransfers",
                        targetIban: receiverAccount.iban,
                        amountValue: transaction.amount,
                        amountCurrency: "EUR",
                    }
                }, { headers: { Authorization: `Bearer ${db_token}` }
                }).then((response) => {
                    return { bank: "deutschebank", step: "getOTP", ...response.data };
                }).catch((error) => {
                    return { bank: "deutschebank", step: "getOTP", ...error.response.data };
                });
                console.log(JSON.stringify(OTPResponse));
                if ("code" in OTPResponse || OTPResponse === undefined)
                    return response.status(500).send({ bank: "deutschebank", code: OTPResponse.message ? OTPResponse.message : "We can't reach Deutschebank Server" });
                return OTPResponse;
            }
            else {
                let OTPResponse = await axios_1.default.patch("https://simulator-api.db.com:443/gw/dbapi/others/onetimepasswords/v2/single/" + request.input("otp_auth_id"), { "response": request.input("otp_auth_key") }, { headers: { Authorization: `Bearer ${db_token}` }
                }).then((response) => {
                    return { bank: "deutschebank", step: "checkOTP", ...response.data };
                })
                    .catch((error) => {
                    return { bank: "deutschebank", step: "checkOTP", ...error.response.data };
                });
                console.log(JSON.stringify(OTPResponse));
                if ("code" in OTPResponse || OTPResponse === undefined)
                    return response.status(500).send({ bank: "deutschebank", code: OTPResponse.message ? OTPResponse.message : "We can't reach Deutschebank Server" });
                let DBResponse = await axios_1.default.post("https://simulator-api.db.com/gw/dbapi/paymentInitiation/payments/v1/instantSepaCreditTransfers", {
                    "debtorAccount": {
                        "iban": senderAccount.iban, "currencyCode": "EUR"
                    },
                    "instructedAmount": {
                        "amount": transaction.amount, "currencyCode": "EUR"
                    },
                    "creditorAccount": {
                        "iban": receiverAccount.iban, "currencyCode": "EUR"
                    },
                    "creditorName": counterParty.first_name + " " + counterParty.last_name,
                }, { headers: {
                        Authorization: `Bearer ${db_token}`,
                        otp: `${OTPResponse.otp}`,
                        'idempotency-id': transaction.uuid,
                    }
                }).then(async (response) => {
                    return response.data;
                }).catch((error) => {
                    return error.response.data;
                });
                console.log(JSON.stringify(DBResponse));
                if ("code" in DBResponse || DBResponse === undefined)
                    return response.status(500).send({ bank: "deutschebank", step: "sendTransaction", code: DBResponse.message ? DBResponse.message : "We can't reach Deutschebank Server" });
                if (true) {
                    transaction.account_sender_id = null;
                    transaction.account_receiver_id = receiverAccount.id;
                    transaction.status = 1;
                    transaction.uuid = DBResponse.paymentId;
                    let RegisterPayment = await MakePayment_1.default(user, counterParty, transaction);
                    if ("code" in RegisterPayment)
                        return response.status(RegisterPayment.status).send({ bank: "deutschebank", step: "sendTransaction", code: RegisterPayment.code });
                    return { bank: "deutschebank", step: "sendTransaction", ...RegisterPayment };
                }
                else {
                    return {
                        bank: "deutschebank",
                        first_name: counterParty.first_name,
                        last_name: counterParty.last_name,
                        profile_picture: counterParty.profile_picture,
                        amount: transaction.amount
                    };
                }
            }
        }
        else if (senderAccount.bank === "rabobank") {
            let transactionBody = {
                "creditorAccount": {
                    "currency": "EUR",
                    "iban": receiverAccount.iban
                },
                "creditorName": counterParty.first_name + " " + counterParty.last_name,
                "debtorAccount": {
                    "currency": "EUR",
                    "iban": senderAccount.iban
                },
                "instructedAmount": {
                    "content": transaction.amount,
                    "currency": "EUR"
                },
            };
            let RB_access_token = await GetToken_1.default(user, "auth_token", "rabobank");
            let transactionHeader = await RabobankRequestHeaderTransaction_1.default(RB_access_token, JSON.stringify(transactionBody));
            let responseRB = await axios_1.default.post("https://api-sandbox.rabobank.nl/openapi/sandbox/payments/payment-initiation/pis/v1/payments/sepa-credit-transfers", transactionBody, transactionHeader).then((response) => {
                return response;
            }).catch((error) => {
                return error.response;
            });
            if (responseRB.status === 200 || responseRB.status === 201) {
                transaction.status = 1;
                let RegisterPayment = await MakePayment_1.default(user, counterParty, transaction);
                if ("code" in RegisterPayment)
                    return response.status(RegisterPayment.status).send({ bank: "rabobank", step: "sendTransaction", code: RegisterPayment.code });
                RegisterPayment.url = responseRB.data._links.scaRedirect.href;
                await senderAccount.save();
                await receiverAccount.save();
                return { bank: "rabobank", step: "sendTransaction", ...RegisterPayment };
            }
            else {
                return response.status(responseRB.status).send({ bank: "rabobank", code: responseRB.data.tppMessages[0].text });
            }
        }
        else {
            let neonomicsAuthToken = await GetToken_1.default(user, "auth_token", "Neonomics");
            let neonomicsSessionId = await GetToken_1.default(user, "auth_token", senderAccount.bank);
            let NeonomicsTransfer = await axios_1.default.post("https://sandbox.neonomics.io/ics/v3/payments/sepa-credit", {
                "creditorAccount": {
                    "iban": receiverAccount.iban
                },
                "debtorAccount": {
                    "iban": senderAccount.iban
                },
                "debtorName": user.first_name + " " + user.last_name,
                "creditorName": counterParty.first_name + " " + counterParty.last_name,
                "remittanceInformationUnstructured": "My test payment",
                "instrumentedAmount": transaction.amount,
                "currency": "EUR",
                "endToEndIdentification": transaction.uuid,
            }, { headers: {
                    "Authorization": `Bearer ${neonomicsAuthToken}`,
                    "x-session-id": neonomicsSessionId,
                    "x-device-id": `PayMe-${user.id}`,
                    "Accept": `application/json`,
                    "Content-Type": "application/json"
                } }).then((response) => {
                return response;
            }).catch((error) => {
                return error.response;
            });
            if ("errorCode" in NeonomicsTransfer.data && (NeonomicsTransfer.data.errorCode == '1426' || NeonomicsTransfer.data.errorCode == '1428')) {
                let responseConsent = await axios_1.default.get(NeonomicsTransfer.data.links[0].href, { headers: {
                        "Authorization": `Bearer ${neonomicsAuthToken}`,
                        "x-session-id": neonomicsSessionId,
                        "x-device-id": `PayMe-${user.id}`,
                        "Accept": `application/json`,
                        "Content-Type": "application/json",
                        "x-redirect-url": process.env.APP_URL + "complete-transaction/neonomics/",
                    } }).then((response) => {
                    return response;
                }).catch((error) => {
                    return error.response;
                });
                if (responseConsent === undefined)
                    return { error: 504, message: "We couldn't fetch the consent link, please try again" };
                return { bank: senderAccount.bank, ...responseConsent.data, url: responseConsent.data.links[0].href };
            }
        }
    }
}
exports.default = OpenBankingController;
//# sourceMappingURL=OpenBankingController.js.map