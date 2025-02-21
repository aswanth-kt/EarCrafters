const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const userMiddleware = require("../middlewares/userMiddleware");    //Session handler
const passport = require('passport');



router.get("/pageNotFound", userController.pageNotFound);

// Home page
router.get("/", userController.loadHomepage);

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
    req.session.user_id = req.user
    res.redirect("/");
});



router.get("/login",userMiddleware, userController.loadLogin);

router.post("/login", userController.login);

router.get("/logout", userController.logout);






module.exports = router;