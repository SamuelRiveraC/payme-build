"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BankAccount_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/BankAccount"));
const FetchAuthToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchAuthToken"));
const FetchAccessToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchAccessToken"));
const FetchRefreshToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchRefreshToken"));
const FetchBankAccounts_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchBankAccounts"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const Database_1 = __importDefault(global[Symbol.for('ioc.use')]("Adonis/Lucid/Database"));
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
    async urgent({}) {
        let user = { id: 1, first_name: "Angela", last_name: "Deutschebank" };
        return user;
    }
    async refreshData({ auth, response }) {
        const user = await auth.authenticate();
        let newToken = {};
        let deutschebank = await GetToken_1.default(user, "refresh_token", "deutschebank");
        let rabobank = await GetToken_1.default(user, "refresh_token", "rabobank");
        let neonomics = await GetToken_1.default(user, "refresh_token", "Neonomics");
        console.log(deutschebank, rabobank, neonomics);
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
    async access_token({ auth, request }) {
        const user = await auth.authenticate();
        const bank = request.input("bank");
        return await GetToken_1.default(user, "auth_token", bank);
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
            console.log(AccessToken);
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
                    await BankAccount_1.default.updateOrCreate({ iban: account.iban }, {
                        user_id: user.id,
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
                    await BankAccount_1.default.updateOrCreate({ iban: account.iban }, {
                        user_id: user.id,
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
                await BankAccount_1.default.updateOrCreate({ iban: account.iban }, {
                    user_id: user.id,
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
    }
}
exports.default = OpenBankingController;
//# sourceMappingURL=OpenBankingController.js.map