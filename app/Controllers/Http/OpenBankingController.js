"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const qs_1 = __importDefault(require("qs"));
const axios_1 = __importDefault(require("axios"));
class OpenBankingController {
    async oauth({ auth, request }) {
        switch (request.input("bank")) {
            case "deutschebank":
                return await axios_1.default.post("https://simulator-api.db.com/gw/oidc/token", qs_1.default.stringify({
                    grant_type: 'authorization_code',
                    code: request.input("code"),
                    redirect_uri: "http://localhost:3000/add-account/deutschebank/"
                }), { headers: {
                        Authorization: `Basic ${Buffer.from(process.env.deutschebank_client + ":" + process.env.deutschebank_secret, 'utf-8').toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        accept: 'application/json',
                    } }).then((response) => {
                    if (response.status === 200)
                        return response;
                    else
                        throw new Error("Error");
                }).catch((error) => { return error; });
                break;
            case "rabobank":
                return await axios_1.default.post("https://api-sandbox.rabobank.nl/openapi/sandbox/oauth2/token", qs_1.default.stringify({
                    grant_type: 'authorization_code',
                    code: request.input("code"),
                    redirect_uri: "http://localhost:3000/add-account/rabobank"
                }), { headers: {
                        Authorization: `Basic ${Buffer.from(process.env.rabobank_client + ":" + process.env.rabobank_secret, 'utf-8').toString('base64')}`,
                        'content-type': 'application/x-www-form-urlencoded',
                        accept: 'application/json',
                    } }).then((response) => {
                    console.log(response.data);
                    if (response.status === 200)
                        return response;
                    else
                        throw new Error("Error");
                }).catch((error) => { console.log(error.response.data); return error; });
                break;
            case "neonomics":
                break;
            default:
                break;
        }
    }
}
exports.default = OpenBankingController;
//# sourceMappingURL=OpenBankingController.js.map