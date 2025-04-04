const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");




const loadCoupon = async (req, res) => {
    try {

        const coupons = await Coupon.find({});

        return res.render("coupon", {
            coupons,
        });
        
    } catch (error) {

        console.error("Error in load coupon page");
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        })
        
    }
};


// Load a new coupon page
const loadCreateCoupon = async (req, res) => {
    try {

        res.render("add-coupon");
        
    } catch (error) {

        console.error("Error in load create coupon");
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        })
        
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
            }
        } = req.body
        console.log("Body data:", req.body)

        const userId = req.session.user;
        const userData = await User.findById(userId);

        if (!userData) {
            return res.status(400).json({
                status: false,
                message: "User Not Found!",
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
        })
        const savedCoupon = await newCoupon.save();

        return res.status(200).json({
            status: true,
            message: "Coupon added successfully..",
        });
        
    } catch (error) {

        console.error("Error in create coupon", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
        
    }
};



// Load edit coupon
const loadEditCoupon = async (req, res) => {
    try {

        const couponId = req.query.couponId
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({
                status: false,
                message: "Coupon not found",
            })
        };

        res.render("edit-coupon", {
            coupon,
        })
        
    } catch (error) {
        
        console.error("Error in load edit coupon", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        })        
    }
};






module.exports = {
    loadCoupon,
    loadCreateCoupon,
    createCoupon,
    loadEditCoupon,
}