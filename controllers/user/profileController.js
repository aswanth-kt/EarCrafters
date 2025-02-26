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
        console.log("Email sent : ", info.messageId);
        return true;
        
    } catch (error) {

        console.error("Error sending email", error);
        return false;
        
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
            const emailSent = await sendVerificationEmail(email, otp);

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
        
    } catch (error) {

        console.error("Error at forgot email validation", error);
        res.redirect("/pageNotFound");
        
        
    }
}





module.exports = {
    getForgotPasswordPage,
    forgotEmailValid,
}