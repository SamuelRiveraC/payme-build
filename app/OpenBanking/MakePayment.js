"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Transaction_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/Transaction"));
const Notification_1 = __importDefault(global[Symbol.for('ioc.use')]("App/Models/Notification"));
async function MakePayment(user, counterParty, transaction, type = "Payment") {
    console.log(transaction.id, transaction.status == "1", type == "Request");
    let storedTransaction = {};
    if (transaction.id !== undefined) {
        storedTransaction = await Transaction_1.default.findOrFail(transaction.id);
        storedTransaction.status = transaction.status;
        storedTransaction.uuid = transaction.uuid;
        storedTransaction.account_sender_id = transaction.account_sender_id;
        storedTransaction.account_receiver_id = transaction.account_receiver_id;
        await storedTransaction.save();
        if (type !== "Update") {
            let notification = await Notification_1.default.findByOrFail('transaction_id', storedTransaction.id);
            notification.status = '1';
            await notification.save();
        }
        if (transaction.status == "1") {
            await Notification_1.default.create({
                transaction_id: storedTransaction.id,
                user_id: counterParty.id,
                type: type === "Request" ? '0' : '1',
                status: '0'
            });
        }
    }
    else {
        storedTransaction = await Transaction_1.default.create(transaction);
        if (transaction.status == "1" || type == "Request") {
            await Notification_1.default.create({
                transaction_id: storedTransaction.id,
                user_id: counterParty.id,
                type: type === "Request" ? '0' : '1',
                status: '0'
            });
        }
    }
    return {
        first_name: counterParty.first_name,
        last_name: counterParty.last_name,
        profile_picture: counterParty.profile_picture,
        amount: transaction.amount
    };
}
exports.default = MakePayment;
//# sourceMappingURL=MakePayment.js.map