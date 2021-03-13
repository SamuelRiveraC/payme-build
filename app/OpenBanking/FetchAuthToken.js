"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const qs_1 = __importDefault(require("qs"));
const axios_1 = __importDefault(require("axios"));
const GetToken_1 = __importDefault(global[Symbol.for('ioc.use')]("App/OpenBanking/GetToken"));
const IPADDRESS = "109.74.179.3";
const DBN_SSN_ENCRYPTED = "ARxbvsVFZnYiYrkVCDOn1AE0EY955HQVMZwSOdV0eSg7QQ2kzfVIlY7Hr/D3";
async function FetchAuthToken(user, BANK, CODE) {
    switch (BANK) {
        case "deutschebank":
            return { auth_url: `https://simulator-api.db.com/gw/oidc/authorize?response_type=code&redirect_uri=${process.env.APP_URL + "add-account/deutschebank/"}&client_id=${process.env.deutschebank_client}` };
            break;
        case "rabobank":
            return { auth_url: `https://api-sandbox.rabobank.nl/openapi/sandbox/oauth2/authorize?client_id=${process.env.rabobank_client}&response_type=code&scope=ais.balances.read%20ais.transactions.read-90days&redirect_uri=${process.env.APP_URL.slice(0, -1)}/add-account/rabobank` };
            break;
        case "neonomics":
            if (CODE === "client_credentials") {
                console.warn("FIRST NEONOMICS");
                let neonomicsResponse = {};
                let neonomicsBanks = {};
                neonomicsResponse = await axios_1.default.post("https://sandbox.neonomics.io/auth/realms/sandbox/protocol/openid-connect/token", qs_1.default.stringify({
                    grant_type: "client_credentials",
                    client_id: process.env.neonomics_client,
                    client_secret: process.env.neonomics_secret,
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }).then((response) => {
                    if (response.status === 200)
                        return response.data;
                    else
                        throw new Error("Error");
                }).catch((error) => { return error; });
                neonomicsBanks = await axios_1.default.get("https://sandbox.neonomics.io/ics/v3/banks", {
                    headers: {
                        Authorization: "Bearer " + neonomicsResponse.accessToken,
                        Accept: "application/json",
                        "x-device-id": "PayMe-" + user.id,
                    }
                }).then((response) => {
                    if (response.status === 200)
                        return response.data;
                    else
                        throw new Error("Error");
                }).catch((error) => { return error; });
                return { ...neonomicsResponse, banks: neonomicsBanks };
            }
            else {
                CODE = JSON.parse(CODE);
                let neonomicsAuthToken = await GetToken_1.default(user, "auth_token", "Neonomics");
                let responseBankSession = await axios_1.default.post("https://sandbox.neonomics.io/ics/v3/session", {
                    bankId: CODE.id
                }, {
                    headers: {
                        Authorization: `Bearer ${neonomicsAuthToken}`,
                        Accept: `application/json`,
                        "x-device-id": "PayMe-" + user.id,
                        "x-psu-id": DBN_SSN_ENCRYPTED
                    }
                }).then((response) => {
                    return response.data;
                }).catch((error) => {
                    return error.response.data;
                });
                let responseAccounts = await axios_1.default.get("https://sandbox.neonomics.io/ics/v3/accounts", { headers: { Authorization: `Bearer ${neonomicsAuthToken}`,
                        Accept: `application/json`, "x-device-id": "PayMe-" + user.id,
                        "x-psu-ip-address": IPADDRESS, "x-session-id": responseBankSession.sessionId,
                        "x-psu-id": DBN_SSN_ENCRYPTED
                    } }).then((response) => {
                    return response.data;
                }).catch((error) => {
                    return error.response.data;
                });
                console.info(responseAccounts);
                if ("errorCode" in responseAccounts && responseAccounts.errorCode == '1426') {
                    console.warn("THIRD NEONOMICS", "errorCode" in responseAccounts, responseAccounts.errorCode == '1426');
                    let responseConsent = await axios_1.default.get(responseAccounts.links[0].href, { headers: { Authorization: `Bearer ${neonomicsAuthToken}`,
                            Accept: `application/json`, "x-device-id": "PayMe-" + user.id,
                            "x-psu-ip-address": IPADDRESS, "x-redirect-url": process.env.APP_URL + "add-account/" + CODE.name + "?code=consented",
                            "x-psu-id": DBN_SSN_ENCRYPTED
                        } }).then((response) => {
                        return response.data;
                    }).catch((error) => { return error.response.data; });
                    console.warn("FINAL NEONOMICS", responseConsent);
                    return { bank: CODE.name, ...responseBankSession, consent_url: responseConsent.links[0].href };
                }
                return { bank: CODE.name, ...responseBankSession, ...responseAccounts };
            }
            break;
        default:
            return "Not a supported Bank";
            break;
    }
}
exports.default = FetchAuthToken;
//# sourceMappingURL=FetchAuthToken.js.map