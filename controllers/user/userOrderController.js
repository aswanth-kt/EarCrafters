const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");







const getOrderDetails = async (req, res) => {
    try {

        const userId = req.session.user;
        const orderId = req.query.orderId;

        const userData = await User.findById(userId).select("name email")

        const order = await Order.findOne({orderId: orderId})
        .populate(
            "orderItems.product",
            "productName productImage"
        )
        .exec();
        console.log("order :", order)
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        };


        const userAddress = await Address.findOne({userId: userData._id})

        const address = userAddress 
        ? userAddress.address.find((addr) => addr.isDefault) : null;

        res.render("order-details", {
            user: userData,
            address,
            order,
        })
    } catch (error) {
        
        console.error("Error in get orders details", error);
        return res.redirect("pageNotFound");
        
    }
};



// // Cncell Order
// const cancelOrder = async (req, res) => {
//     try {

//         const {productId, reason, otherReason, cancelQuantity, cancelledAt} = req.body;
//         console.log("Body :", req.body);

//         if (!req.body) {
//             return res.status(404).json({
//                 message: "No data in body"
//             });
//         };

//         const quantityToAdd = parseInt(cancelQuantity);

//         const order = await Order.findOne({"orderItems.product": productId})
//         .populate("orderItems.product");
        
//         if (!order) {
//             return res.status(404).json({
//                 message: "Order not found"
//             });
//         }

//         const orderItem = order.orderItems.find(item => item.product._id.toString() === productId.toString());

//         if (!orderItem) {
//             return res.status(404).json({
//                 message: "Product not found in order"
//             });
//         };

//         // Update product quantity
//         const updateProduct = await Product.findByIdAndUpdate(
//             productId,
//             {$inc: {quantity: quantityToAdd} },    // add cancel product quantity in to DB
//             {new: true}
//         );
//         console.log("Updated product result:", updateProduct);

//         if (!updateProduct) {
//             return res.status(404).json({
//                 message: "Product update failed, order not cancelled"
//             })
//         };


//         // Update the order return status and reason
//         await Order.findOneAndUpdate(
//             { 
//                 _id: order._id,
//                 "orderItems.product": productId,
//             },
//             {$set : 
//                 {
//                     "orderItems.$.returnReason": reason || otherReason,
//                     "orderItems.$.returnStatus": "Returned",
//                     "orderItems.$.quantity": orderItem.quantity - quantityToAdd,

//                 }
//             },
//             { new: true }
//         );

//         await Order.findByIdAndUpdate(
//             order._id,
//             {
//                 $pull: {
//                     orderItems: { orderItems: productId }
//                 }
//             },
//             { new: true }
//         );

//         return res.status(200).json({
//             success: true,
//             message: "Order cancelled successfully"
//         });
        
//     } catch (error) {
        
//         console.error("Error in cancel order", error);
//         res.status(500).json({
//             message: "Internal server error"
//         })
        
//     }
// }


const cancelOrder = async (req, res) => {
    try {
        const {productId, reason, otherReason, cancelQuantity, cancelledAt} = req.body;
        console.log("Body :", req.body);

        if (!req.body) {
            return res.status(404).json({
                message: "No data in body"
            });
        };

        const quantityToAdd = parseInt(cancelQuantity);

        const order = await Order.findOne({"orderItems.product": productId})
        .populate("orderItems.product");
        
        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const orderItem = order.orderItems.find(item => item.product._id.toString() === productId.toString());

        if (!orderItem) {
            return res.status(404).json({
                message: "Product not found in order"
            });
        };

        // Update product quantity
        const updateProduct = await Product.findByIdAndUpdate(
            productId,
            {$inc: {quantity: quantityToAdd}},    // add cancel product quantity in to DB
            {new: true}
        );
        console.log("Updated product result:", updateProduct);

        if (!updateProduct) {
            return res.status(404).json({
                message: "Product update failed, order not cancelled"
            });
        };

        // I think keep this and d
        const updatedOrderDetails = await Order.findOneAndUpdate(
            { 
                _id: order._id,
                "orderItems.product": productId,
            },
            {$set : 
                {
                    "orderItems.$.returnReason": reason || otherReason,
                    "orderItems.$.returnStatus": "Returned",
                    "orderItems.$.quantity": Math.max(0, orderItem.quantity - quantityToAdd),
                }
            },
            { new: true }
        );
        console.log("Updated order details:", updatedOrderDetails);
        
        const updatedOrder = await Order.findByIdAndUpdate(
            order._id,
            {
                $pull: {
                    orderItems: { product: productId }
                }
            },
            { new: true }
        );
        console.log("Updated order after removal:", updatedOrder);
        

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully"
        });
        
    } catch (error) {
        console.error("Error in cancel order", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};








module.exports = {
    getOrderDetails,
    cancelOrder,
}