const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");

const applyCoupon = async (req, res) => {
  try {
    const { code, totalPrice } = req.body;
    const userId = req.session.user;

    const userData = await User.findById(userId);

    // Find the coupon
    const coupon = await Coupon.findOne({ name: code });
    if (!coupon) {
      return res.status(BadRequest).json({
        status: false,
        message: "Coupon not found",
      });
    }

    // Validate coupon expiration
    if (coupon.expireOn < new Date()) {
      return res.status(BadRequest).json({
        status: false,
        message: "Coupon has expired",
      });
    }

    // Validate minimum purchase amount
    if (totalPrice < coupon.minimumPrice) {
      return res.status(BadRequest).json({
        status: false,
        message: `Minimum purchase amount of ₹${coupon.minimumPrice} not met`,
      });
    }

    // Check if user has already used this coupon
    if (coupon.usedBy.includes(userData._id)) {
      return res.status(BadRequest).json({
        status: false,
        message: "You have already used this coupon",
      });
    }

    // Check if coupon discount is greater than total price
    if (coupon.offerPrice >= totalPrice) {
      return res.status(BadRequest).json({
        status: false,
        message: `This coupon offers ₹${
          coupon.offerPrice
        } discount. Please add more items worth at least ₹${
          coupon.offerPrice - totalPrice + 1
        } to use this coupon.`,
      });
    }

    // Calculate new total price
    const newTotalPrice = totalPrice - coupon.offerPrice;

    // Save pending coupon to session
    req.session.pendingCoupon = {
      couponId: coupon._id,
      code: coupon.name,
      offerPrice: coupon.offerPrice,
      originalPrice: totalPrice,
    };

    // const order = await Order.find

    res.json({
      status: true,
      offerPrice: coupon.offerPrice,
      newTotalPrice,
    });
  } catch (error) {
    console.error("Error in apply coupon:", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Controller function for removing a coupon
const removeCoupon = async (req, res) => {
  try {
    // If there's a pending coupon in the session, remove it
    if (req.session.pendingCoupon) {
      const originalPrice = req.session.pendingCoupon.originalPrice;

      // Remove the pending coupon from session
      req.session.pendingCoupon = null;

      return res.json({
        status: true,
        message: "Coupon removed successfully",
        originalPrice,
      });
    }

    return res.status(BadRequest).json({
      status: false,
      message: "No coupon applied",
    });
  } catch (error) {
    console.error("Error in remove coupon:", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Controller function to get available coupons for the user
const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.session.user;

    const userData = await User.findById(userId);

    // Find all valid coupons that the user hasn't used yet
    const coupons = await Coupon.find({
      expireOn: { $gt: new Date() },
      usedBy: { $nin: [userData._id] },
    });

    res.json(coupons);
  } catch (error) {
    console.error("Error fetching available coupons:", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  // loadCoupons,
  applyCoupon,
  removeCoupon,
  getAvailableCoupons,
};
