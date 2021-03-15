"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Database_1 = __importDefault(global[Symbol.for('ioc.use')]("Adonis/Lucid/Database"));
async function GetToken(user, type, name) {
    let token = await Database_1.default.query().from('api_tokens')
        .where('user_id', user.id).andWhere('type', type).andWhere('name', name)
        .orderBy('created_at', 'desc').limit(1);
    if (token[0] && token[0]["token"])
        return token[0]["token"];
    return null;
}
exports.default = GetToken;
//# sourceMappingURL=GetToken.js.map