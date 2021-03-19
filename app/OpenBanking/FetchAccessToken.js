"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const qs_1 = __importDefault(require("qs"));
const axios_1 = __importDefault(require("axios"));
async function FetchAccessToken(user, BANK, CODE) {
    switch (BANK) {
        case "deutschebank":
            let deutschebankResponse = await axios_1.default.post("https://simulator-api.db.com/gw/oidc/token", qs_1.default.stringify({
                grant_type: 'authorization_code',
                code: CODE,
                redirect_uri: process.env.APP_URL + "add-account/deutschebank/"
            }), {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.deutschebank_client + ":" + process.env.deutschebank_secret, 'utf-8').toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    accept: 'application/json',
                }
            }).then((response) => {
                return response.data;
            }).catch((error) => { return error.response.data; });
            if (deutschebankResponse === undefined)
                return { error: 504, message: "We couldn't log in Deutschebank, Please try again" };
            console.log(deutschebankResponse);
            return deutschebankResponse;
            break;
        case "rabobank":
            let rabobankResponse = await axios_1.default.post("https://api-sandbox.rabobank.nl/openapi/sandbox/oauth2/token", qs_1.default.stringify({
                grant_type: 'authorization_code',
                code: CODE,
                redirect_uri: process.env.APP_URL + "add-account/rabobank"
            }), {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.rabobank_client + ":" + process.env.rabobank_secret, 'utf-8').toString('base64')}`,
                    'content-type': 'application/x-www-form-urlencoded',
                    accept: 'application/json',
                }
            }).then((response) => {
                return response.data;
            }).catch((error) => { return error.response.data; });
            if (rabobankResponse === undefined)
                return { error: 504, message: "We couldn't log in Rabobank, Please try again" };
            return rabobankResponse;
            break;
        case "neonomics":
            return { error: 504, message: "You accessed Neonomics as you would with other APIs, (This error shouldn't show up)" };
            break;
        default:
            return { error: 400, message: "Bank not supported" };
            break;
    }
}
exports.default = FetchAccessToken;
//# sourceMappingURL=FetchAccessToken.js.map