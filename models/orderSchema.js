const mongoose = require('mongoose');
const {Schema} = mongoose;


const orderSchema = new Schema ({
    orderId : {
        type : String,
        required : true,
        unique : true,
    },
    razorpayOrderId : {
        type : String,
        required : false,
        unique : true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
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
        cancellationStatus: {
            type: String,
            enum: ["Cancelled", "Not Cancelled"],
            default: "Not Cancelled",
            required: true,
        },
        cancellationReason: {
            type: String,
            required: false,
        },  //Reason for cancellation

        returnStatus: {
            type: String,
            enum: ["Not Requested", "Requested", "Returned"],
            default: "Not Requested",
        },
        returnReason: {
            type: String,
            required: false,
        }, // Reason for return

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
        ref : "Address",
        required : true
    },
    status : {
        type : String,
        required : true,
        enum : [
            "Order Placed", 
            "Processing", 
            "Shipped", 
            "Delivered", 
            "Cancelled",
            "Return Request",
            "Returned",
            'Return Declined',
            "Payment Pending",
        ]
    },
    invoiceDate : {
        type : Date,
        // default : Date.now
    },
    createdOn : {
        type : Date,
        default : Date.now,
        required : true
    },
    couponApplied : {
        type : Boolean,
        default : false
    },
    paymentMethod: {
        type: String,
        enum: ["upi", "cod", "wallet"],
        required: true,
      },
      moneySent: {
        type: Boolean,
        default: false,
      },
      deliveredAt: {
        type: Date,
        required: false,
      },
      firstDeliveredAt: {
        type: Date,
        required: false,
      },
      cancellationReason: {
        type: String,
        required: false,
      },
})



const Order = mongoose.model("Order", orderSchema);

module.exports = Order;