"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function NeonomicsUniqueId(user) {
    console.log(`FirstPayMe-${user.id}-${user.first_name[0]}${user.last_name[0]}-${new Date(user.createdAt).valueOf()}`);
    return `FirstPayMe-${user.id}-${user.first_name[0]}${user.last_name[0]}-${new Date(user.createdAt).valueOf()}`;
}
exports.default = NeonomicsUniqueId;
//# sourceMappingURL=NeonomicsUniqueId.js.map