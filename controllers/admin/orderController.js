const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");







const getOrderList = async (req, res) => {
    try {

        const search = req.query.search || "";

        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;

        // Search by user name
        const users = await User.find({
            name: new RegExp(search, "i"),
        });

        const userIds = users.map((user) => user._id);

        const orders = await Order.find({
            $or: [
                {orderId: new RegExp(search, "i") },
                {userId: {$in: userIds} },
                {status: new RegExp(search, "i") },
            ],
        })
        .populate("userId")
        .populate("orderItems.product")
        .sort({createdOn: -1})
        .skip(skip)
        .limit(limit);

        const totalOrders = await Order.countDocuments({
            $or: [
                {orderId: new RegExp(search, "i")},
                {userId: {$in: userIds}},
                {status: new RegExp(search, "i")},
            ],
        });

        const totalPages = Math.ceil(totalOrders / limit);

        res.render("order", {
            orderData: orders,
            totalPages,
            currentPage: page,
        });
        
    } catch (error) {
        
        console.error("Error in get order list", error);
        return res.status(500).send("Internal server error")
        
    }
};



// Load admin order details
const loadOrderDetailsPage = async (req, res) => {
    try {

        const orderId = req.query.orderId;

        const order = await Order.findById(orderId)
        .populate("userId")
        .populate("orderItems.product")
        .exec();
        
        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found",
            });
        };

        const userAddresses = await Address.findOne({userId: order.userId}).select("address");
        if (!userAddresses) {
            return res.status(404).json({
                status: false,
                message: "User address not found",
            });
        };

        const defaultAddress = userAddresses
        ? userAddresses.address.find(addr => addr.isDefault) : null;
        // console.log("Default address:", defaultAddress, "User address:", userAddresses);

        const productId = order.orderItems.find(item => item.product);
        console.log("Load order details productId:", productId._id);

        if (!productId) {
            return res.status(404).json({
                status: false,
                message: "Product Id not found",
            });
        };

        const returnReason = order.orderItems.map(item => 
            item.returnReason
        )
        console.log("returnReason: ", returnReason);

        res.render("admin-order-details", {
            order,
            defaultAddress,
            productId: productId._id,
            returnReason,
        })
        
    } catch (error) {
        
        console.error("Error in load order details page", error);
        res.status(500).json({
            status: false,
            Message: "Internal server error"
        })
        
    }
};



// // Update order status for tracking
// const updateOrderStatus = async (req, res) => {
//     try {

//         // const declinedStatus = req.query.declinedStatus;    //Check if click cancel button

//         const {orderId, status, productId, declinedStatus} = req.body;
//         console.log("Body:", req.body)

//         const order = await Order.findById(orderId).populate("orderItems.product");

//         if (!order) {
//             return res.status(404).json({
//                 status: false,
//                 message: "Order not found,"
//             });
//         };

//         let orderItem = null;
//         if (productId) {
//             orderItem = order.orderItems.find(item => 
//                 item.product._id.toString() == productId.toString());
//             console.log("Order item:", orderItem)
//         };
        
//         if (!orderItem) {
//             return res.status(404).json({
//                 status: false,
//                 message: "Order Item not found,"
//             });
//         };

//          // If return status is Requested change to Returned
//         if (orderItem.returnStatus === "Requested" && !declinedStatus) {      
//             orderItem.returnStatus = "Returned";
//         } else if (declinedStatus === "Return Declined") {
//             orderItem.returnStatus = "Return Declined";
//         }
        
//         // Update Main order status
//         if (declinedStatus) {
//             order.status = declinedStatus;
//         } else {
//             order.status = status
//         }

//         // Save order updates
//         await order.save();

//         res.status(200).json({
//             status: true,
//             message: `Order status updated to ${status}`,
//             order
//         })
        
//     } catch (error) {
        
//         console.error("Error in update order status", error);
//         res.status(500).json({
//             status: false,
//             message: "Internal server errror"
//         })
//     }
// };


const updateOrderStatus = async (req, res) => {
    try {
        const {orderId, status, productId, declinedStatus} = req.body;
        console.log("Body:", req.body);
        console.log("ProductID:", productId, typeof productId);

        const order = await Order.findById(orderId).populate("orderItems.product");

        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found"
            });
        }

        console.log("Order items count:", order.orderItems.length);
        
        // Print each product ID for debugging
        order.orderItems.forEach((item, index) => {
            console.log(`Item ${index} product ID:`, item.product._id.toString());
        });

        // Change this from array to null initialization
        let orderItem = null;
        
        if (productId) {
            // Ensure both are strings when comparing
            orderItem = order.orderItems.find(item => 
                item.product._id.toString() === productId.toString()
            );
            console.log("Found order item:", orderItem ? "Yes" : "No");
        }
        
        // If we need to process a return but don't have an item, check all items
        if ((status === "Returned" || declinedStatus) && !orderItem) {
            // Either handle all items or return error based on your business logic
            // Option 1: Handle all items with requested return status
            const returnableItems = order.orderItems.filter(item => item.returnStatus === "Requested");
            
            if (returnableItems.length > 0) {
                // Process all returnable items
                returnableItems.forEach(item => {
                    if (declinedStatus) {
                        item.returnStatus = "Return Declined";
                    } else {
                        item.returnStatus = "Returned";
                    }
                });
                
                order.status = declinedStatus || status;
                await order.save();
                
                return res.status(200).json({
                    status: true,
                    message: `Order items return status updated`,
                    order
                });
            } else {
                return res.status(404).json({
                    status: false,
                    message: "No returnable items found"
                });
            }
        }
        
        // Continue with your existing logic for the found orderItem...
        if (orderItem) {
            if (orderItem.returnStatus === "Requested" && !declinedStatus) {      
                orderItem.returnStatus = "Returned";
            } else if (declinedStatus === "Return Declined") {
                orderItem.returnStatus = "Return Declined";
            }
            
            // Update Main order status
            if (declinedStatus) {
                order.status = declinedStatus;
            } else {
                order.status = status;
            }
            
            await order.save();
            
            return res.status(200).json({
                status: true,
                message: `Order status updated to ${status}`,
                order
            });
        }
        
        // Non-return related status updates
        if (!orderItem && !status.includes("Return")) {
            order.status = status;
            await order.save();
            
            return res.status(200).json({
                status: true,
                message: `Order status updated to ${status}`,
                order
            });
        }
        
        // If we get here, something is wrong
        return res.status(400).json({
            status: false,
            message: "Could not process order status update"
        });
        
    } catch (error) {
        console.error("Error in update order status", error);
        res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};






module.exports = {
    getOrderList,
    loadOrderDetailsPage,
    updateOrderStatus,
}