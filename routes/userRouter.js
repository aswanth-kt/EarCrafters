const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const userMiddleware = require("../middlewares/userMiddleware");    //Session handler
// const CheckBlockedUser = require("../middlewares/userMiddleware");
const profileController = require("../controllers/user/profileController");
const {userAuth, adminAuth} = require("../middlewares/auth");
const passport = require('passport');



router.get("/pageNotFound", userController.pageNotFound);

// Home page
router.get("/", userAuth, userController.loadHomepage);

//Shpe page
router.get("/shop", userController.loadShop);

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

router.get("/change-email", userAuth, profileController.loadChangeEmailPage);

router.post("/change-email", userAuth, profileController.changeEmailValid);

router.post("/verify-email-otp", userAuth, profileController.verifyChangeEmailOtp);

router.post("/update-email", userAuth, profileController.updateEmail);

router.get("/change-password", userAuth, profileController.loadChangePasswordPage);

router.post("/change-password", userAuth, profileController.changePasswordValid);

router.put("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp);





module.exports = router;