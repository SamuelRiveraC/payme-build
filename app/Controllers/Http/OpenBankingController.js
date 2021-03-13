"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BankAccount_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/BankAccount"));
const FetchAuthToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchAuthToken"));
const FetchAccessToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchAccessToken"));
const FetchBankAccounts_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/FetchBankAccounts"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
class OpenBankingController {
    async OAuthAuth({ auth, request }) {
        const user = await auth.authenticate();
        const bank = request.input("bank");
        const code = request.input("code");
        let AuthToken = await FetchAuthToken_1.default(user, bank, code);
        if ("auth_url" in AuthToken) {
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
        else {
            console.warn("controller else", AuthToken);
            return AuthToken;
        }
    }
    async urgent({ auth }) {
        const user = await auth.authenticate();
        const result = await GetToken_1.default(user, "access_token", "deutschebank");
        return result;
    }
    async OAuthAccessAndBanks({ auth, request }) {
        const user = await auth.authenticate();
        const bank = request.input("bank");
        const code = request.input("code");
        if ((bank == "deutschebank" || bank == "rabobank")) {
            let AccessToken = await FetchAccessToken_1.default(user, bank, code);
            await auth.use('api').generate(user, {
                name: bank,
                type: "access_token",
                token: AccessToken.access_token,
            });
            await auth.use('api').generate(user, {
                name: bank,
                type: "refresh_token",
                token: AccessToken.refresh_token,
            });
            let GetBankAccounts = await FetchBankAccounts_1.default(user, bank);
            if (GetBankAccounts.length > 0) {
                await BankAccount_1.default.query().where('user_id', user.id).update({ primary: 'false' });
            }
            else {
                return true;
            }
            if (bank === "deutschebank") {
                GetBankAccounts.forEach(async (account, index) => {
                    await BankAccount_1.default.updateOrCreate({ iban: account.iban }, {
                        user_id: user.id,
                        bank: "deutschebank",
                        alias: `${account.productDescription} (${user.last_name})`,
                        balance: account.currentBalance,
                        bic: account.bic,
                        primary: index === 0 ? 'true' : 'false',
                    });
                });
            }
            else if (bank === "rabobank") {
            }
            let StoredBankAccounts = GetBankAccounts;
            return StoredBankAccounts;
        }
        let GetBankAccounts = await FetchBankAccounts_1.default(user, bank);
        if (GetBankAccounts.length > 0) {
            await BankAccount_1.default.query().where('user_id', user.id).update({ primary: 'false' });
            GetBankAccounts.forEach(async (account, index) => {
                await console.log(GetBankAccounts.length, account.iban);
                await BankAccount_1.default.updateOrCreate({ iban: account.iban }, {
                    user_id: user.id,
                    bank: bank,
                    alias: `${account.accountName} (${user.last_name})`,
                    balance: account.balances[0].amount,
                    bic: "Update pending",
                    primary: index === 0 ? 'true' : 'false',
                });
            });
            return GetBankAccounts;
        }
    }
}
exports.default = OpenBankingController;
//# sourceMappingURL=OpenBankingController.js.map