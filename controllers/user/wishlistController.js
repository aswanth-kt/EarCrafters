const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");

// Load page wishlist
const loadWishlistPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    // console.log("Wishlist user data :", userData)

    const products = await Product.find({
      _id: { $in: userData.wishlist },
    }).populate("category");
    // console.log("Wishlist products ;", products)

    res.render("wishlist", {
      user: userData,
      wishlist: products,
    });
  } catch (error) {
    console.error(" error in Load wishlist page", error);
    res.status(InternalServerError).redirect("/pageNotFound");
  }
};

// Add products to wishlist
const addToWishlist = async (req, res) => {
  try {
    const productId = req.body.productId;

    const user = req.session.user;
    const userData = await User.findById(user);

    if (userData.wishlist.includes(productId)) {
      return res
        .status(OK)
        .json({ status: false, message: "Product already in wishlist" });
    }

    userData.wishlist.push(productId);
    await userData.save();
    return res
      .status(Created)
      .json({ status: true, message: "Product added to wishlist" });
  } catch (error) {
    console.error("Error in add to wishlist", error);
    return res
      .status(InternalServerError)
      .json({ status: false, message: "Internal server error" });
  }
};

// Remove product from wishlist
const removeProduct = async (req, res) => {
  try {
    const productId = req.query.productId;
    const user = req.session.user;

    const userData = await User.findById(user);
    // find index that product in wishlist array
    const index = userData.wishlist.indexOf(productId);
    userData.wishlist.splice(index, 1); // Remove the product from wishlist array
    await userData.save();

    return res.status(OK).redirect("/wishlist");
  } catch (error) {
    console.error("Error in remove product from wishlist", error);
    return res
      .status(InternalServerError)
      .json({ status: false, message: "Internal server error" });
  }
};

module.exports = {
  loadWishlistPage,
  addToWishlist,
  removeProduct,
};
