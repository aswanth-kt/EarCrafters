const User = require("../../models/userSchema");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const evn = require('dotenv').config();
const session = require('express-session');
const { text } = require("express");




// Generate OTP
function generateOtp() {
    const digit = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digit[Math.floor(Math.random()*10)];
    }
    return otp
};


// Function for Send OTP 
const sendVerificationEmail = async (email, otp) => {
    try {

        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4> Your OTP : ${otp} </h4></b>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent : ", email);
        return true;
        
    } catch (error) {

        console.error("Error sending email", error);
        return false;
        
    }
};



// function for Secure password (Hash Password)
const securePassword = async (password) => {
    try {

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
        
    } catch (error) {

        console.error("Error in Secure password(Hash)", error);
        
    }
}



// Load forgot page
const getForgotPasswordPage = async (req, res) => {
    try {

        res.render("forgot-password");
        
    } catch (error) {
        
        console.error("Error at get forgot password", error);
        res.redirect("/pageNotFound");
        
    }
};



const forgotEmailValid = async (req, res) => {
    try {

        const {email} = req.body;

        const findUser = await User.findOne({email: email});
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp)
            // .catch(err => {
            //     console.error("Error sending email:", err);
            //     return false;
            // });

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;

                res.render("forgotPass-otp");
                console.log("Password reset OTP: ", otp);
                
            } else {
                res.status(401).json({success: false, message: "Failed to send OTP. Please try again."});
            }
        } else {
            res.render("forgot-password", {message: "Email does not match, Please confirm email!"})
        }
        console.log(req.session.email)
        
    } catch (error) {

        console.error("Error at forgot email validation", error);
        res.redirect("/pageNotFound");
        
        
    }
};



// Password reset OTP
const verifyForgotPassOtp = async (req, res) => {
    try {

        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.status(200).json({success: true, redirectUrl:"/reset-password"});
        } else {
            res.status(400).json({success: false, message: "OTP is not match"});
        }
        
    } catch (error) {

        console.error("Error at verify forgot otp", error);
        res.status(500).json({success: false, message: "An error occured. Please try again"});
        
    }
};


// Load reset password page
const getResetPassPage = async (req, res) => {
    try {

        res.render("reset-password");
        
    } catch (error) {

        console.error("Error at get reset pass page", error);
        res.redirect("/pageNotFound");
        
    }
};



// Resent OTP
const resendOtp = async (req, res) => {
    try {

        const otp = generateOtp();
        req.session.userOtp = otp;
        
        const email = req.session.email;
        console.log("Resending OTP to ", email);
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            console.log("Resend otp:" ,otp);
            res.status(200).json({success: true, message: "Resend OTP seccessfull"});
        }
        
    } catch (error) {

        console.error("Error in resend otp", error);
        res.status(500).json({success: false, message: "Internal server error"});
        
    }
};



// Update new password (Reset password)
const updatePassword = async (req, res) => {
    try {

        const {newPass1, newPass2} = req.body;
        // console.log("User enter password: ", newPass1," ", newPass2);
        
        const email = req.session.email;

        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1);
            // console.log("Has pass: ", passwordHash);
            
            await User.updateOne(
                {email: email},
                {$set:{
                    password: passwordHash
                }}
            )
            res.redirect("/login")
        } else {
            res.render("reset-password", {message: "Password do not match"});
        }
        
    } catch (error) {

        console.error("Error in Update password");
        res.redirect("/pageNotFound");
        
    }
}





module.exports = {
    getForgotPasswordPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    updatePassword,
}