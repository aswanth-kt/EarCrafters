const mongoose = require('mongoose');
const {Schema} = mongoose;
const {v4 : uudv4} = require('uuid');


const orderSchema = new Schema ({
    orderId : {
        type : String,
        default : () => uuidv4(),
        unique : true
    },
    orderItems : [{
        product : {
            type : Schema.Types.ObjectId,
            ref : "Product",
            required : true
        },
        quantity : {
            type : Number,
            required : true
        },
        price : {
            type :Number,
            default : 0
        },

    }],
    totalPrice : {
        type : Number,
        required : true
    },
    discount : {
        type : Number,
        default : 0
    },
    finalAmount : {
        type : Number,
        required : true
    },
    address : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    invoiceDate : {
        type : Date,
        // default : Date.now
    },
    status : {
        type : String,
        required : true,
        enum : ["Pending", "Processing", "Sipped", "Delivere", "Cancelled", "Return Request", "Returned"]
    },
    createdOn : {
        type : Date,
        default : Date.now,
        required : true
    },
    coupenApplied : {
        type : Boolean,
        default : false
    }
})



const Order = mongoose.model("Order", orderSchema);

module.exports = Order;