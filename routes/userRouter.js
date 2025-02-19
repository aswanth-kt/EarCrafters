const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');



router.get("/pageNotFound", userController.pageNotFound);

// Home page
router.get("/", userController.loadHomepage);

//Sign up Managements
router.get("/pageNotFound", userController.pageNotFound)

router.get("/signup", userController.loadSignup);

router.post("/signup", userController.signup);

router.post("/verify-otp", userController.verifyOtp);

router.post("/resend-otp", userController.resendOtp);

// Google authenticate
router.get("/auth/google", passport.authenticate("google", {scope : ["profile", "email"]}));
router.get("/auth/google/callback", passport.authenticate("google", {failureRedirect : "/signup"}), (req, res) => {
    res.redirect("/");
});



router.get("/login", userController.loadLogin);

router.post("/login", userController.login);








module.exports = router;