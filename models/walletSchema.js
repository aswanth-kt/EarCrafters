const mongoose = require('mongoose');
const {Schema} = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
    },
    lastTransactionDate: {
        type: Number,
        default: Date.now,
    },
    createdAt: {
        type: Number,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Wallet = mongoose.model("wallet", walletSchema);

module.exports = Wallet;