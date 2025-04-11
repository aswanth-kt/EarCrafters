const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");







const getOrderDetails = async (req, res) => {
    try {

        const userId = req.session.user;
        const orderId = req.query.orderId;

        const userData = await User.findById(userId).select("name email")

        const order = await Order.findOne({_id: orderId})
        .populate(
            "orderItems.product",
            "productName productImage"
        )
        .exec();

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        };

        // const isAllItemCancelled = order.orderItems.filter(item => item.cancellationStatus).length === order.orderItems.length;
        // console.log("All item cancelled :", isAllItemCancelled)

        const userAddress = await Address.findOne({userId: userData._id})

        const address = userAddress 
        ? userAddress.address.find((addr) => addr.isDefault) : null;

        res.render("order-details", {
            user: userData,
            address,
            order,
            // isAllItemCancelled
        })
    } catch (error) {
        
        console.error("Error in get orders details", error);
        return res.redirect("pageNotFound");
        
    }
};



const cancelOrder = async (req, res) => {
    try {
        const {productId, reason, otherReason, cancelQuantity, orderId ,cancelledAt} = req.body;
        console.log("Body :", req.body);

        if (!req.body) {
            return res.status(404).json({
                message: "No data in body"
            });
        };

        const quantityToAdd = parseInt(cancelQuantity);

        const order = await Order.findOne({orderId: orderId})
        .populate("orderItems.product");

        // console.log("Order with orderId:", order)

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

        if (!updateProduct) {
            return res.status(404).json({
                message: "Product update failed, order not cancelled"
            });
        };

        // Update order details
        const updatedOrder = await Order.findByIdAndUpdate(
            order._id ,
            {
                $set: {
                    "orderItems.$[elem].cancellationReason": otherReason || reason || "No reason provided",
                    "orderItems.$[elem].cancellationStatus": "Cancelled",
                }
            },
            {
                new: true,
                arrayFilters: [{ "elem.product": new mongoose.Types.ObjectId(productId) }]
            }
        );

        // console.log("Before update:", order.orderItems);
        // console.log("Updated order details:", updatedOrder);

        const isAllItemCancelled = updatedOrder.orderItems.every(item => item.cancellationStatus === "Cancelled");
        console.log("is all item cancelled? :", isAllItemCancelled)
        if (isAllItemCancelled) {
            await Order.findByIdAndUpdate(
                order._id,
                {$set: {status : "Cancelled"} },  // If all cancelled set to status cancelled
                {new: true}
            )
        }
        

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            updatedOrder,
        });
        
    } catch (error) {
        console.error("Error in cancel order", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};





// Load Tracking page
const loadTrackOrders = async (req, res) => {
    try {
        
        const orderId = req.query.orderId;
        const user = req.session.user;

        const order = await Order.findById(orderId);
        console.log("order in track:", order)
        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found"
            });
        };

        res.render("track-order", {
            user,
            order,
        })

        
    } catch (error) {
        
        console.error("Error in load order track", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        })
    }
};



// After delivered Cancel a product
// const returnProduct = async (req, res) => {
//     try {

//         const {productId, reason, otherReason, orderId ,returneddAt} = req.body;
//         console.log("Body :", req.body);

//         const userId = req.session.user;
//         const userData = await User.findById(userId);

//         if (!userData) {
//             return res.status(400).json({
//                 status: false,
//                 message: "User not found"
//             })
//         };

//         const order = await Order.findOne({userId: userData._id});

//         if (!order) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Order not found"
//             })
//         };

//         const orderItem = order.orderItems.find(item => item.product._id.toString() === productId.toString());
//         console.log("orderItem:", orderItem);

//         if (!orderItem) {
//             return res.status(404).json({
//                 message: "Product not found in order"
//             });
//         };

//         const updatedOrder = await Order.findByIdAndUpdate(
//             order._id,
//             {
//                 $set:{'orderItems.$[elem].returnStatus': "Requested",
//                     'orderItems.$[elem].returnReason': reason || otherReason,
//                 }
//             },
//             {new: true},
//         );

//         if (!updatedOrder) {
//             return res.status(400).json({
//               status: false,
//               message: "Failed to update order"
//             });
//         }

//         res.status(200).json({
//             status: true,
//             message: "Return request submitted and awaiting admin approval",
//             order: updatedOrder,
//         })
        
//     } catch (error) {
        
//         console.error("Error in return product", error);
//         return res.status(500).json({
//             status: false,
//             message: "Internal server error",
//         })
        
//     }
// }


const returnProduct = async (req, res) => {
    try {
      const { productId, reason, otherReason, orderId, returnedAt } = req.body;
      console.log("Return Request Body:", req.body);
  
      const userId = req.session.user;
      const userData = await User.findById(userId);
  
      if (!userData) {
        return res.status(404).json({
          status: false,
          message: "User not found"
        });
      }
  
      // Find the specific order
      const order = await Order.findOne({ 
        userId: userData._id, 
        orderId: orderId 
      });
  
      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found"
        });
      }
  
      // Find the index of the specific product in orderItems array
      const itemIndex = order.orderItems.findIndex(
        item => item.product._id.toString() === productId.toString()
      );
  
      if (itemIndex === -1) {
        return res.status(404).json({
          status: false,
          message: "Product not found in order"
        });
      }
  
      // Use dot notation to update a specific item in the array
      const updateQuery = {};
      updateQuery[`orderItems.${itemIndex}.returnStatus`] = "Requested";
      updateQuery[`orderItems.${itemIndex}.returnReason`] = reason === 'other' ? otherReason : reason;
      updateQuery[`orderItems.${itemIndex}.returnedAt`] = returnedAt || new Date().toISOString();
  
      const updatedOrder = await Order.findByIdAndUpdate(
        order._id,
        { $set: updateQuery },
        { new: true }
      );

      if (updatedOrder.orderItems[itemIndex].returnStatus === "Requested") {
        updatedOrder.status = "Return Request";
        await updatedOrder.save();
      }
  
      if (!updatedOrder) {
        return res.status(400).json({
          status: false,
          message: "Failed to update order"
        });
      };

      console.log("Updated order:", updatedOrder);
  
      res.status(200).json({
        status: true,
        message: "Return request submitted and awaiting admin approval",
        order: updatedOrder
      });
        
    } catch (error) {
      console.error("Error in return product:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error"
      });
    }
  };


module.exports = {
    getOrderDetails,
    cancelOrder,
    loadTrackOrders,
    returnProduct,
}