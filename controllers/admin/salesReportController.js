const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Category = require("../../models/categorySchema");
const Coupon = require("../../models/couponSchema");





const loadSalesReport = async (req, res) => {
    try {

        const orders = await Order.find({});
        if (!orders) {
            return res.status(400).json({
                status: false,
                message: "There is no orders available"
            })
        };

        // Total count of sales
        const overallSalesCount = await Order.countDocuments({status: "Delivered"});

        // Total of all orders
        const overallOrderAmount = orders.filter(order => order.status === "Delivered")
        .reduce((acc, item) => {
            // console.log(acc, item)
            return acc + item.finalAmount
        }, 0);

        res.render("salesReport",{
            overallSalesCount,
            overallOrderAmount
        });
        
    } catch (error) {
        
        console.error("Error in load sales report:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        })

    }
};




module.exports = {
    loadSalesReport,
}