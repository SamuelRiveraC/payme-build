"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const qs_1 = __importDefault(require("qs"));
const axios_1 = __importDefault(require("axios"));
async function FetchRefreshToken(user, refresh_token, bank) {
    switch (bank) {
        case "deutschebank":
            let responseDB = await axios_1.default.post("https://simulator-api.db.com/gw/oidc/token", qs_1.default.stringify({
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                redirect_uri: process.env.APP_URL + "add-account/deutschebank/"
            }), { headers: {
                    Authorization: `Basic ${Buffer.from(process.env.deutschebank_client + ":" + process.env.deutschebank_secret, 'utf-8').toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    accept: 'application/json',
                }
            }).then((response) => {
                return response;
            }).catch((error) => { return error.response; });
            if (responseDB === undefined)
                return { error: 500, message: "We couldn't fetch the refresh tokens, please try again" };
            if ("errorCode" in responseDB.data)
                return { error: 500, message: responseDB.data.errorCode + ": " + responseDB.data.message };
            return responseDB.data;
            break;
        case "rabobank":
            let responseRB = await axios_1.default.post("https://api-sandbox.rabobank.nl/openapi/sandbox/oauth2/token", qs_1.default.stringify({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }), {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.rabobank_client + ":" + process.env.rabobank_secret, 'utf-8').toString('base64')}`,
                    'content-type': 'application/x-www-form-urlencoded',
                    accept: 'application/json',
                }
            }).then((response) => {
                return response;
            }).catch((error) => { return error.response; });
            if (responseRB === undefined)
                return { error: 500, message: "We couldn't fetch the refresh tokens, please try again" };
            if ("errorCode" in responseRB.data)
                return { error: 500, message: responseRB.data.errorCode + ": " + responseRB.data.message };
            return responseRB.data;
            break;
        case "Neonomics":
            let response = await axios_1.default.post("https://sandbox.neonomics.io/auth/realms/sandbox/protocol/openid-connect/token", qs_1.default.stringify({
                grant_type: "refresh_token",
                refresh_token: refresh_token,
                client_id: process.env.neonomics_client,
                client_secret: process.env.neonomics_secret,
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then((response) => {
                return response;
            }).catch((error) => { return error.response; });
            if (response === undefined)
                return { error: 500, message: "We couldn't fetch the refresh tokens, please try again" };
            if ("errorCode" in response.data)
                return { error: 500, message: response.data.errorCode + ": " + response.data.message };
            return response.data;
            break;
        default:
            break;
    }
}
exports.default = FetchRefreshToken;
//# sourceMappingURL=FetchRefreshToken.js.map