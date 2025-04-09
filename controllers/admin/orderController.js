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
        console.log("Default address:", defaultAddress, "User address:", userAddresses);

        res.render("admin-order-details", {
            order,
            defaultAddress,
        })
        
    } catch (error) {
        
        console.error("Error in load order details page", error);
        res.status(500).json({
            status: false,
            Message: "Internal server error"
        })
        
    }
};



// Update order status for tracking
const updateOrderStatus = async (req, res) => {
    try {

        const {orderId, status} = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found,"
            });
        };

        // Update order status
        order.status = status;

        // Save order updates
        await order.save();

        res.status(200).json({
            status: true,
            message: `Order status updated to ${status}`,
        })
        
    } catch (error) {
        
        console.error("Error in update order status", error);
        res.status(500).json({
            status: false,
            message: "Internal server errror"
        })
    }
};








module.exports = {
    getOrderList,
    loadOrderDetailsPage,
    updateOrderStatus,
}