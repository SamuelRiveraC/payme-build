"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BankAccount_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/BankAccount"));
const FetchRefreshToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchRefreshToken"));
const FetchBankAccounts_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchBankAccounts"));
const FetchTransactions_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchTransactions"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const Database_1 = __importDefault(global[Symbol.for('ioc.use')]("Adonis/Lucid/Database"));
class RefreshController {
    async refreshTokens({ auth }) {
        const user = await auth.authenticate();
        let newToken = {};
        let deutschebank = await GetToken_1.default(user, "refresh_token", "deutschebank");
        let rabobank = await GetToken_1.default(user, "refresh_token", "rabobank");
        let neonomics = await GetToken_1.default(user, "refresh_token", "Neonomics");
        if (deutschebank !== undefined && deutschebank !== null) {
            newToken = await FetchRefreshToken_1.default(user, deutschebank, "deutschebank");
            if (!("error" in newToken)) {
                await Database_1.default.from('api_tokens')
                    .where('user_id', user.id)
                    .andWhere('name', "deutschebank")
                    .andWhere('type', "auth_token")
                    .delete();
                await auth.use('api').generate(user, {
                    name: "deutschebank", type: "auth_token",
                    token: newToken.access_token,
                    expiresIn: newToken.expires_in + " seconds"
                });
            }
        }
        if (rabobank !== undefined && rabobank !== null) {
            newToken = await FetchRefreshToken_1.default(user, rabobank, "rabobank");
            if (!("error" in newToken)) {
                await Database_1.default.from('api_tokens').where('user_id', user.id).andWhere('name', "rabobank").delete();
                await auth.use('api').generate(user, {
                    name: "rabobank", type: "auth_token",
                    token: newToken.access_token,
                    expiresIn: newToken.expires_in + " seconds"
                });
                await auth.use('api').generate(user, {
                    name: "rabobank", type: "refresh_token",
                    token: newToken.refresh_token,
                    expiresIn: newToken.refresh_expires_in + " seconds"
                });
            }
        }
        if (neonomics !== undefined && neonomics !== null) {
            newToken = await FetchRefreshToken_1.default(user, neonomics, "Neonomics");
            if (!("error" in newToken)) {
                await Database_1.default.from('api_tokens').where('user_id', user.id).andWhere('name', "Neonomics").delete();
                await auth.use('api').generate(user, {
                    name: "neonomics", type: "auth_token",
                    token: newToken.access_token,
                    expiresIn: newToken.expires_in + " seconds"
                });
                await auth.use('api').generate(user, {
                    name: "neonomics", type: "refresh_token",
                    token: newToken.refresh_token,
                    expiresIn: newToken.refresh_expires_in + " seconds"
                });
            }
        }
    }
    async getSelfData({ auth }) {
        let user = await auth.authenticate();
        return { ...user.serialize() };
    }
    async fetchNotifications({ auth }) {
        let user = await auth.authenticate();
        await user.preload('notifications', (query) => {
            query.where("status", 0);
            query.preload('transaction', (query) => {
                query.preload('sender');
                query.preload('receiver');
            });
        });
        const NotificationsSorted = user.notifications.sort(function (a, b) {
            return a.status - b.status;
        }).sort(function (a, b) {
            let c = new Date(a.updated_at);
            let d = new Date(b.updated_at);
            return d - c;
        });
        return [...NotificationsSorted];
    }
    async fetchBanks({ auth }) {
        let user = await auth.authenticate();
        await user.preload('bankAccounts');
        let primaryAccount = user.bankAccounts.find((account) => {
            return account.primary === "true";
        });
        if (primaryAccount !== undefined && primaryAccount.bank == "deutschebank") {
            let GetBankAccounts = await FetchBankAccounts_1.default(user, primaryAccount.bank);
            if (GetBankAccounts.length > 0) {
                for (const [index, account] of GetBankAccounts.entries()) {
                    if (primaryAccount.iban === account.iban && primaryAccount.bank === "deutschebank") {
                        await BankAccount_1.default.updateOrCreate({ iban: account.iban, user_id: user.id }, {
                            balance: account.currentBalance,
                        });
                    }
                    else if (primaryAccount.iban === account.iban) {
                        await BankAccount_1.default.updateOrCreate({ iban: account.iban, user_id: user.id }, {
                            balance: account.balances[0].amount < 0 ? account.balances[0].amount * -1 : account.balances[0].amount
                        });
                    }
                }
            }
            await user.preload('bankAccounts');
        }
        return [...user.bankAccounts];
    }
    async fetchTransactions({ auth }) {
        let user = await auth.authenticate();
        await user.preload('bankAccounts');
        let primaryAccount = user.bankAccounts.find((account) => {
            return account.primary === "true";
        });
        if (primaryAccount === undefined) {
            return [];
        }
        await primaryAccount.preload('transactionsSent', (query) => {
            query.where('status', 1);
            query.preload('sender');
            query.preload('receiver');
        });
        await primaryAccount.preload('transactionsReceived', (query) => {
            query.where('status', 1);
            query.preload('sender');
            query.preload('receiver');
        });
        let AllTransactions = [];
        if (primaryAccount.transactionsSent === null || primaryAccount.transactionsSent === undefined) {
            AllTransactions = [...primaryAccount.transactionsSent];
        }
        else if (primaryAccount.transactionsReceived === null || primaryAccount.transactionsReceived === undefined) {
            AllTransactions = [...primaryAccount.transactionsReceived];
        }
        else {
            AllTransactions = [...primaryAccount.transactionsSent, ...primaryAccount.transactionsReceived];
        }
        let transactionsAPI = [];
        if (primaryAccount !== undefined && primaryAccount.bank !== "payme") {
            transactionsAPI = await FetchTransactions_1.default(user, primaryAccount);
            AllTransactions = AllTransactions.concat(transactionsAPI.slice(0, 9));
        }
        AllTransactions = AllTransactions.sort(function (a, b) {
            let c = new Date(a.updated_at);
            let d = new Date(b.updated_at);
            return d - c;
        });
        return AllTransactions.slice(0, 9);
    }
}
exports.default = RefreshController;
//# sourceMappingURL=RefreshController.js.map