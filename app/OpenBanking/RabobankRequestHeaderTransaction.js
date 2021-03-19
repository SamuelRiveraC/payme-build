"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
async function RabobankRequestHeaderAccounts(RB_access_token) {
    const https = require('https');
    const fs = require('fs');
    const certificate = fs.readFileSync('cert.pem');
    const privateKey = fs.readFileSync('key.pem');
    const httpsAgent = new https.Agent({
        "x-ibm-client-id": process.env.rabobank_client,
        cert: certificate,
        key: privateKey,
    });
    let digest = crypto_1.default.createHash('sha512').update("").digest("hex");
    digest = new Buffer(digest, "hex");
    digest = Buffer.from(digest).toString('base64');
    let requestId = uuid_1.v4();
    let requestDate = new Date().toUTCString();
    let signingString = `date: ${requestDate}\ndigest: SHA-512=${digest}\nx-request-id: ${requestId}`;
    let signingRSASHA512 = crypto_1.default.createSign('RSA-SHA512');
    signingRSASHA512.update(signingString);
    let signedString = signingRSASHA512.sign(privateKey, 'hex');
    signedString = new Buffer(signedString, "hex");
    signedString = Buffer.from(signedString).toString('base64');
    let signature = `keyId="1523433508",algorithm="rsa-sha512",headers="date digest x-request-id",signature="${signedString}"`;
    return {
        httpsAgent,
        headers: {
            Authorization: `Bearer ${RB_access_token}`,
            accept: `application/json`,
            date: `${requestDate}`,
            "x-request-id": requestId,
            "tpp-signature-certificate": process.env.rabobank_signing_cer,
            "x-ibm-client-id": process.env.rabobank_client,
            digest: `SHA-512=${digest}`,
            signature: `${signature}`,
        }
    };
}
exports.default = RabobankRequestHeaderAccounts;
//# sourceMappingURL=RabobankRequestHeaderTransaction.js.map