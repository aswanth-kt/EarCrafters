const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const userMiddleware = require("../middlewares/userMiddleware");    //Session handler
// const CheckBlockedUser = require("../middlewares/userMiddleware");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const wishlistController = require("../controllers/user/wishlistController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/userOrderController");
const {userAuth, adminAuth} = require("../middlewares/auth");
const passport = require('passport');



router.get("/pageNotFound", userController.pageNotFound);

// Home page
router.get("/", userAuth, userController.loadHomepage);


//Shoping Management
router.get("/shop", userAuth, userController.loadShopPage);

router.get("/filter", userAuth, userController.filterProducts);

router.get("/filterPrice", userAuth, userController.filterByPrice);

router.post("/search", userAuth, userController.searchProducts);

router.get("/filterPriceLowToHigh", userAuth, userController.filterPriceLowToHigh);

router.get("/filterPriceHighToLow", userAuth, userController.filterPriceHighToLow);

router.get("/filterA-Z", userAuth, userController.filterNameAscendingOrder);

router.get("/filterZ-A", userAuth, userController.filterNameDescendingOrder);



//Sign up Managements
router.get("/pageNotFound", userController.pageNotFound);

router.get("/signup" , userMiddleware, userController.loadSignup);

router.post("/signup", userController.signup);

router.post("/verify-otp", userController.verifyOtp);

router.post("/resend-otp", userController.resendOtp);

// Google authenticate
router.get("/auth/google", passport.authenticate("google", {scope : ["profile", "email"]}));
router.get("/auth/google/callback", passport.authenticate("google", {failureRedirect : "/signup"}), (req, res) => {
    req.session.user = req.user
    res.redirect("/");
});


// Login Management
router.get("/login",userMiddleware, userController.loadLogin);

router.post("/login", userController.login);

router.get("/logout", userController.logout);


//Profile Management
router.get("/forgotPassword", profileController.getForgotPasswordPage);

router.post("/forgotEmailValid", profileController.forgotEmailValid);

router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);

router.get("/reset-password", profileController.getResetPassPage);

router.post("/resend-forgot-otp", profileController.resendOtp);

router.post("/reset-password", profileController.updatePassword);

router.get("/userProfile", userAuth, profileController.getUserProfilePage);

router.get("/edit-userProfile", userAuth, profileController.getEditUserProfilePage);

router.put("/edit-profile/:fieldName", userAuth, profileController.editProfile);

router.get("/change-email", userAuth, profileController.loadChangeEmailPage);

router.post("/change-email", userAuth, profileController.changeEmailValid);

router.post("/verify-email-otp", userAuth, profileController.verifyChangeEmailOtp);

router.post("/update-email", userAuth, profileController.updateEmail);

router.get("/change-password", userAuth, profileController.loadChangePasswordPage);

router.post("/change-password", userAuth, profileController.changePasswordValid);

router.put("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp);



// Address Management
router.get("/addAddress", userAuth, profileController.getAddAddressPage);

router.post("/addAddress", userAuth, profileController.postAddAddress);

router.get("/editAddress", userAuth, profileController.getEditAddress);

router.post("/editAddress", userAuth, profileController.postEditAddress);

router.get("/deleteAddress", userAuth, profileController.deleteAddress);



// Product Management
router.get("/productDetails", userAuth, productController.productDetails);



// Wishlist Management
router.get("/wishlist", userAuth, wishlistController.loadWishlistPage);

router.post("/addToWishlist", userAuth, wishlistController.addToWishlist);

router.get("/removeFromWishlist", userAuth, wishlistController.removeProduct);



// Cart Management
router.get("/cart", userAuth, cartController.getCartPage);

router.post("/addToCart",userAuth, cartController.addToCart);

router.post("/changeQuantity", userAuth,cartController.changeQuantity);

router.get("/deleteItem", userAuth, cartController.deleteProduct);
// Update product quantity from product details
router.put("/cart/update-quantity/:productId", userAuth, cartController.updateCartQuantity);



// Checkout Management
router.get("/checkout", userAuth, checkoutController.getCheckoutPage);
// Checkout Management Update Default Address
router.post("/update-default-address", userAuth, checkoutController.updateDefaultAddress);
// When click edit button in checkout page then go to post edit address at Address management
router.get("/editCheckoutAddress", userAuth, checkoutController.getEditCheckoutAddress);

router.get("/addCheckoutAddress", userAuth, checkoutController.getaddCheckoutAddress);

router.post("/checkout/place-order", userAuth, checkoutController.codPlaceOrder);

router.get("/order-success", userAuth, checkoutController.getOrderSuccess);



// User Order Management
router.get("/order-details", userAuth, orderController.getOrderDetails);

router.post("/profile/order-details/cancel-product", userAuth, orderController.cancelOrder);









module.exports = router;