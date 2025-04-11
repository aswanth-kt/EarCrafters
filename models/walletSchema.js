const mongoose = require('mongoose');
const {Schema} = mongoose;

const walletTransactionSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
  type: {
    type: String,
    enum: ['credit', 'debit', 'failed'],
    required: true
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

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
        type: Date,
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
    transactions: [walletTransactionSchema]
});

const Wallet = mongoose.model("wallet", walletSchema);

module.exports = Wallet;