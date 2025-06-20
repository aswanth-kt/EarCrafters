const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const Wallet = require("../../models/walletSchema");
const Cart = require("../../models/cartSchema");
const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.orderId;

    const userData = await User.findById(userId).select("name email");

    const order = await Order.findOne({ _id: orderId })
      .populate("orderItems.product", "productName productImage")
      .exec();

    if (!order) {
      return res.status(NotFound).json({ message: "Order not found" });
    }

    // const isAllItemCancelled = order.orderItems.filter(item => item.cancellationStatus).length === order.orderItems.length;
    // console.log("All item cancelled :", isAllItemCancelled)

    const userAddress = await Address.findOne({ userId: userData._id });

    const address = userAddress
      ? userAddress.address.find((addr) => addr.isDefault)
      : null;

    if (!address) {
      return res.status(BadRequest).json({
        status: false,
        message: "Address not found!!",
      });
    }

    const cart = await Cart.findOne({ userId: userData._id }).populate(
      "items.productId"
    );

    if (!cart) {
      return res.status(BadRequest).json({
        status: false,
        message: "Cart not found",
      });
    }

    const cartItems = cart ? cart.items : [];

    let gst = order.finalAmount * 18 / 100;

    res.render("order-details", {
      user: userData,
      address,
      order,
      orderItems: cartItems,
      cartItems,
      gst,
    });
  } catch (error) {
    console.error("Error in get orders details", error);
    return res.redirect("pageNotFound");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(BadRequest).json({
        status: false,
        message: "User not found",
      });
    }

    const {
      productId,
      reason,
      otherReason,
      cancelQuantity,
      orderId,
      cancelledAt,
      finalAmount,
      price,
      totalPrice,
    } = req.body;
    // console.log("Body :", req.body);

    if (!req.body) {
      return res.status(NotFound).json({
        message: "No data in body",
      });
    }

    const quantityToAdd = parseInt(cancelQuantity);

    const order = await Order.findOne({ orderId: orderId }).populate(
      "orderItems.product"
    );

    // console.log("Order with orderId:", order)

    if (!order) {
      return res.status(NotFound).json({
        message: "Order not found",
      });
    }

    const orderItem = order.orderItems.find(
      (item) => item.product._id.toString() === productId.toString()
    );

    if (!orderItem) {
      return res.status(NotFound).json({
        message: "Product not found in order",
      });
    }

    // Update product quantity
    const updateProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: quantityToAdd } }, // add cancel product quantity in to DB
      { new: true }
    );

    if (!updateProduct) {
      return res.status(NotFound).json({
        message: "Product update failed, order not cancelled",
      });
    }

    // Update order details
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          "orderItems.$[elem].cancellationReason":
            otherReason || reason || "No reason provided",
          "orderItems.$[elem].cancellationStatus": "Cancelled",
        },
      },
      {
        new: true,
        arrayFilters: [
          { "elem.product": new mongoose.Types.ObjectId(productId) },
        ],
      }
    );

    // console.log("Before update:", order.orderItems);
    // console.log("Updated order details:", updatedOrder);

    const isAllItemCancelled = updatedOrder.orderItems.every(
      (item) => item.cancellationStatus === "Cancelled"
    );
    // console.log("is all item cancelled? :", isAllItemCancelled);
    if (isAllItemCancelled) {
      await Order.findByIdAndUpdate(
        order._id,
        { $set: { status: "Cancelled" } }, // If all cancelled set to status cancelled
        { new: true }
      );
    };

    // After product cancellation money back to add wallet
    const couponDidcount = Number(order.discount);
    const cancelProductPrice = Number((price / totalPrice) * couponDidcount); // Find one without coupon product price
    const priceWithoutOffer = Number(price - cancelProductPrice);
    const roundedPrice = Math.round(priceWithoutOffer);

    let wallet = await Wallet.findOne({ userId: userData._id });

    if (!wallet) {
      wallet = new Wallet ({
        userId: userData._id,
        balance: roundedPrice,
        transactions: [{
          type: "credit",
          description: "Cancelled product amount added to wallet",
          amount: roundedPrice,
          balance: roundedPrice,
          createdAt: new Date(),
        }]
      })
    } else {
      wallet.balance += roundedPrice;
      // Save transaction history
      wallet.transactions.push({
        type: "credit",
        amount: roundedPrice,
        description: "Cancelled product amount added to wallet",
        balance: wallet.balance,
        createdAt: new Date(),
      });
    }

    await wallet.save();

    return res.status(OK).json({
      status: true,
      message: "Order cancelled successfully",
      updatedOrder,
    });

  } catch (error) {
    
    console.error("Error in cancel order", error);
    res.status(InternalServerError).json({
      message: "Internal server error",
    });
  }
};

// Load Tracking page
const loadTrackOrders = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const user = req.session.user;

    const order = await Order.findById(orderId);
    // console.log("order in track:", order);
    if (!order) {
      return res.status(NotFound).json({
        status: false,
        message: "Order not found",
      });
    }

    res.render("track-order", {
      user,
      order,
    });
  } catch (error) {
    console.error("Error in load order track", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const returnProduct = async (req, res) => {
  try {
    const {
      productId,
      reason,
      otherReason,
      orderId,
      returnedAt,
      finalAmount,
      price,
      totalPrice,
    } = req.body;
    // console.log("Return Request Body:", req.body);

    const userId = req.session.user;
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(NotFound).json({
        status: false,
        message: "User not found",
      });
    }

    // Find the specific order
    const order = await Order.findOne({
      userId: userData._id,
      orderId: orderId,
    });

    if (!order) {
      return res.status(NotFound).json({
        status: false,
        message: "Order not found",
      });
    }

    // Find the index of the specific product in orderItems array
    const itemIndex = order.orderItems.findIndex(
      (item) => item.product._id.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(NotFound).json({
        status: false,
        message: "Product not found in order",
      });
    }

    const updateQuery = {};
    updateQuery[`orderItems.${itemIndex}.returnStatus`] = "Requested";
    updateQuery[`orderItems.${itemIndex}.returnReason`] =
      reason === "other" ? otherReason : reason;
    updateQuery[`orderItems.${itemIndex}.returnedAt`] =
      returnedAt || new Date().toISOString();

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
      return res.status(BadRequest).json({
        status: false,
        message: "Failed to update order",
      });
    }
    // console.log("Updated order:", updatedOrder);

    const couponDidcount = Number(updatedOrder.discount);
    const cancelProductPrice = Number((price / totalPrice) * couponDidcount); // Find one without coupon product price
    const priceWithoutOffer = Number(price - cancelProductPrice);
    const roundedPrice = Math.round(priceWithoutOffer);
    // console.log(
    //   "couponDiscount:",
    //   couponDidcount,
    //   "cancelProductPrice:",
    //   cancelProductPrice,
    //   "roundedPrice:",
    //   roundedPrice
    // ); //Debuging

    let wallet = await Wallet.findOne({ userId: userData._id });

    if (!wallet) {
      wallet = new Wallet({
        userId: userData._id,
        balance: roundedPrice,
        transactions: [{
          type: "credit",
          description: "Returned product amount added to wallet",
          amount: roundedPrice,
          balance: roundedPrice,
          createdAt: new Date(),
        }]
      })
    } else {
      wallet.balance += roundedPrice;
      // Save transaction history
      wallet.transactions.push({
        type: "credit",
        amount: roundedPrice,
        description: "Returned product amount added to wallet",
        balance: wallet.balance,
        createdAt: new Date(),
      });
    }
    await wallet.save();
    

    res.status(OK).json({
      status: true,
      message: "Return request submitted and waiting admin approval",
      order: updatedOrder,
    });

  } catch (error) {
    
    console.error("Error in return product:", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

//   Razorpay retry payment
const retryPayment = async (req, res) => {
  try {
    const {
      orderItems,
      addressId,
      finalAmount,
      status,
      paymentMethod,
      orderId,
      gst,
    } = req.body;
    // console.log("req.body:", req.body);

    const userId = req.session.user;

    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(BadRequest).json({
        status: false,
        message: "User not found!",
      });
    }

    const userAddress = await Address.findOne({ "address._id": addressId });
    const defaultAddress = userAddress.address
      .flat()
      .filter((add) => add.isDefault === true);
    // console.log("User address:", defaultAddress);

    if (!defaultAddress) {
      return res.status(BadRequest).json({
        status: false,
        message: "User Address not found!",
      });
    }

    const amountInPaise = Math.round(finalAmount * 100);

    // Create a NEW Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${new Date().getTime()}`,
      payment_capture: 1,
    };

    if (!razorpay) {
      console.error("Razorpay instance not initialized");
      return res.status(InternalServerError).json({
        status: false,
        message: "Payment gateway not properly configured",
      });
    }

    // Create a new Razorpay order
    const razorpayOrder = await razorpay.orders.create(options);

    // Update the order with the new Razorpay order ID
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: status,
          razorpayOrderId: razorpayOrder.id,
          gst: gst,
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(NotFound).json({
        status: false,
        message: "Order not found",
      });
    }

    // Return the NEW Razorpay order details to frontend
    res.status(OK).json({
      status: true,
      message: "Success",
      orderId: orderId,
      razorpayOrderId: razorpayOrder.id, // Send the new ID
      amount: amountInPaise,
      currency: "INR",
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      paymentMethod: paymentMethod || "upi",
    });
  } catch (error) {
    console.error("Error in retry payment:", error);
    return res.status(InternalServerError).json({
      message: "Internal server error",
      status: false,
    });
  }
};

module.exports = {
  getOrderDetails,
  cancelOrder,
  loadTrackOrders,
  returnProduct,
  retryPayment,
};
