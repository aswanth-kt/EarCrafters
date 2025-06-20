const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");

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
        { orderId: new RegExp(search, "i") },
        { userId: { $in: userIds } },
        { status: new RegExp(search, "i") },
      ],
    })
      .populate("userId")
      .populate("orderItems.product")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({
      $or: [
        { orderId: new RegExp(search, "i") },
        { userId: { $in: userIds } },
        { status: new RegExp(search, "i") },
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
    return res.status(InternalServerError).send("Internal server error");
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
      return res.status(NotFound).json({
        status: false,
        message: "Order not found",
      });
    }

    const userAddresses = await Address.findOne({
      userId: order.userId,
    }).select("address");
    if (!userAddresses) {
      return res.status(NotFound).json({
        status: false,
        message: "User address not found",
      });
    }

    const defaultAddress = userAddresses
      ? userAddresses.address.find((addr) => addr.isDefault)
      : null;
    // console.log("Default address:", defaultAddress, "User address:", userAddresses);

    const productId = order.orderItems.find((item) => item.product);
    // console.log("Load order details productId:", productId._id);

    if (!productId) {
      return res.status(NotFound).json({
        status: false,
        message: "Product Id not found",
      });
    }

    const returnReason = order.orderItems.map((item) => item.returnReason);
    // console.log("returnReason: ", returnReason);

    res.render("admin-order-details", {
      order,
      defaultAddress,
      productId: productId._id,
      returnReason,
    });
  } catch (error) {
    console.error("Error in load order details page", error);
    res.status(InternalServerError).json({
      status: false,
      Message: "Internal server error",
    });
  }
};

// // Update order status for tracking
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status, productId, declinedStatus } = req.body;
    // console.log("Body:", req.body);
    // console.log("ProductID:", productId, typeof productId);

    const order = await Order.findById(orderId).populate("orderItems.product");

    if (!order) {
      return res.status(NotFound).json({
        status: false,
        message: "Order not found",
      });
    }

    // console.log("Order items count:", order.orderItems.length);

    // Print each product ID for debugging
    // order.orderItems.forEach((item, index) => {
    //   console.log(`Item ${index} product ID:`, item.product._id.toString());
    // });

    let orderItem = null;

    if (productId) {
      orderItem = order.orderItems.find(
        (item) => item.product._id.toString() === productId.toString()
      );
      // console.log("Found order item:", orderItem ? "Yes" : "No");
    }


    if ((status === "Returned" || declinedStatus) && !orderItem) {
      const returnableItems = order.orderItems.filter(
        (item) => item.returnStatus === "Requested"
      );

      if (returnableItems.length > 0) {
        // Process all returnable items
        returnableItems.forEach((item) => {
          if (declinedStatus) {
            item.returnStatus = "Return Declined";
          } else {
            item.returnStatus = "Returned";

          }
        });

        order.status = declinedStatus || status;
        await order.save();

        return res.status(OK).json({
          status: true,
          message: `Order items return status updated`,
          order,
        });
      } else {
        return res.status(NotFound).json({
          status: false,
          message: "No returnable items found",
        });
      }
    }

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

      // Update product Qty..
      // if (order.status === "Returned") {
      //   const updatedProduct = Product.findByIdAndUpdate(productId,
      //     {$inc: {quantity: ?}}
      //   )
      // }

      return res.status(OK).json({
        status: true,
        message: `Order status updated to ${status}`,
        order,
      });
    }

    // Non-return related status updates
    if (!orderItem && !status.includes("Return")) {
      order.status = status;
      await order.save();

      return res.status(OK).json({
        status: true,
        message: `Order status updated to ${status}`,
        order,
      });
    }

    return res.status(BadRequest).json({
      status: false,
      message: "Could not process order status update",
    });
  } catch (error) {
    console.error("Error in update order status", error);
    res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getOrderList,
  loadOrderDetailsPage,
  updateOrderStatus,
};
