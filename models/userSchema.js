const mongoose = require('mongoose');
const {Schema} = mongoose;


const userSchema = new Schema ({
    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    phone : {
        type : String,
        required : false,
        unique : false,
        sparse : true,  //for g-auth not need phone
        default : null
    },
    googleId: { 
        type: String, 
        // sparse: true, 
        unique: true,  
        // default : undefined,
        required : false
      },
    password : {
        type : String,
        required : false
    },
    isBlock : {
        type : Boolean,
        default : false
    },
    isAdmin : {
        type : Boolean,
        default : false
    },
    wishlist:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
    cart : [
        {
            type : Schema.Types.ObjectId,
            ref : "Cart",
        }
    ],
    // cart: [{
    //     productId: {
    //       type: Schema.Types.ObjectId,
    //       ref: 'Cart'
    //     },
    //     quantity: Number
    // }],
    wallet : [
        {
            type : Schema.Types.ObjectId,
            ref : "Wishlist"
        }
    ],
    orderHistory : {
        type : Schema.Types.ObjectId,
        ref : "Order"
    },
    createdOn : {
        type : Date,
        default : Date.now
    },
    referralCode : {
        type : String,
        // required : true
    },
    redeemed : {
        type : Boolean,
        // default : false
    },
    redeemedUsers : {
        type : Schema.Types.ObjectId,
        ref : "User",
        // required : true
    },
    searchHistory : [
        {
            category : {
                type : Schema.Types.ObjectId,
                ref : "Category"
            },
            brand : {
                type : String,
                ref : "Category"
            },
            searchedOn : {
                type : Date,
                default : Date.now
            }
        }
    ]
});





const User = mongoose.model("User", userSchema);

module.exports = User;