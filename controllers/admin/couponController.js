const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");
const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");

const loadCoupon = async (req, res) => {
  try {
    const search = req.query.search;

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find({
      name: new RegExp(search, "i"),
    })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalCoupons = await Coupon.countDocuments({
      name: new RegExp(search, "i"),
    });

    const totalPages = Math.ceil(totalCoupons / limit);

    return res.render("coupon", {
      coupons: coupons || null,
      totalPages,
      currentPage: page,
      search,
    });
  } catch (error) {
    console.error("Error in load coupon page");
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Load a new coupon page
const loadCreateCoupon = async (req, res) => {
  try {
    res.render("add-coupon");
  } catch (error) {
    console.error("Error in load create coupon");
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Create a new coupon
const createCoupon = async (req, res) => {
  try {
    const {
      couponData: {
        couponName,
        startDate,
        expirationDate,
        offerPrice,
        minPurchaseAmount,
      },
    } = req.body;
    // console.log("Body data:", req.body)

    const userId = req.session.user;
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(BadRequest).json({
        status: false,
        message: "User Not Found!",
      });
    }

    // Check offer price grater than min price.
    if (offerPrice > minPurchaseAmount) {
      return res.status(BadRequest).json({
        status: false,
        message: "Minimum purchase amount should be greater than offer price"
      })
    };

    // const coupon = await Coupon.findOne({userId: userData._id});
    // Create a new coupon
    const newCoupon = new Coupon({
      userId: userData._id,
      name: couponName,
      createdOn: new Date(startDate),
      expireOn: new Date(expirationDate),
      offerPrice: parseInt(offerPrice),
      minimumPrice: parseInt(minPurchaseAmount),
    });
    const savedCoupon = await newCoupon.save();

    return res.status(OK).json({
      status: true,
      message: "Coupon added successfully..",
    });
  } catch (error) {
    console.error("Error in create coupon", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Load edit coupon
const loadEditCoupon = async (req, res) => {
  try {
    const couponId = req.query.couponId;
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(NotFound).json({
        status: false,
        message: "Coupon not found",
      });
    }

    res.render("edit-coupon", {
      coupon: coupon || null,
      couponId,
    });
  } catch (error) {
    console.error("Error in load edit coupon", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const editCoupon = async (req, res) => {
  try {
    // Form data received
    const couponId = req.body.couponId;

    const inputData = req.body.plainData;
    // console.log("plainData:", inputData);

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        $set: {
          name: inputData.couponName,
          expireOn: new Date(inputData.expirationDate),
          offerPrice: parseInt(inputData.offerPrice),
          minimumPrice: parseInt(inputData.minPurchaseAmount),
        },
      },
      { new: true }
    );

    if (!coupon) {
      return res.status(NotFound).json({
        status: false,
        message: "Coupon not found",
      });
    }

    return res.status(OK).json({
      status: true,
      message: "Updated successfully!",
      redirectUrl: "/admin/coupon",
    });
  } catch (error) {
    console.error("Error in edit coupon", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Coupon listed
const couponListed = async (req, res) => {
  try {
    const couponId = req.body.couponId;
    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, {
      $set: { isList: true },
    });

    if (!updatedCoupon) {
      return res.status(NotFound).json({
        status: false,
        message: "Coupon not found or not updated",
      });
    }

    return res.status(OK).json({
      status: true,
      message: "Coupon listed, Now visible to customers.",
    });
  } catch (error) {
    console.error("Error in coupon listed", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const couponUnlisted = async (req, res) => {
  try {
    const couponId = req.body.couponId;
    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, {
      $set: { isList: false },
    });

    if (!updatedCoupon) {
      return res.status(NotFound).json({
        status: false,
        message: "Coupon not found or not updated",
      });
    }

    return res.status(OK).json({
      status: true,
      message: "Coupon is Unlisted, Now not visible to customers.",
    });
  } catch (error) {
    console.error("Error in coupon listed", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.body.couponId;
    if (!couponId) {
      return res.status(BadRequest).json({
        status: false,
        message: "CouponId is not found",
      });
    }

    const updatedCoupon = await Coupon.findByIdAndDelete(couponId);
    if (!updatedCoupon) {
      return res.status(BadRequest).json({
        status: false,
        message: "Error in deleting coupon!",
      });
    }

    return res.status(OK).json({
      status: true,
      message: "Coupon deleted successfully!",
    });
  } catch (error) {
    console.error("Error in delete coupon", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  loadCoupon,
  loadCreateCoupon,
  createCoupon,
  loadEditCoupon,
  editCoupon,
  couponListed,
  couponUnlisted,
  deleteCoupon,
};
