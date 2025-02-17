
const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();



const loadHomepage = async (req, res) => {
    try {

        return res.render("home");
        
    } catch (error) {

        console.log("Home page not found");
        res.status(500).send("Server error");
    }
};


const pageNotFound = async (req, res) => {
    try {

        return res.status(404).render("page-404");
        
    } catch (error) {
        res.redirect("/pageNoteFound")
        res.status(404).send("400 page Not Found");
    }
}


const loadSignup = async (req, res) => {
    try {
        
        return res.render("signup");

    } catch (error) {
        
        console.log("Home page not loading" , error);
        res.status(500).send("Server error");
    }
}


// To generate OTP
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


async function sendVerificationEmail(email, otp) {
    try {
        
        const transporter = nodemailer.createTransport({
            service : "gmail",
            port : 587,
            secure : false,
            requireTLS : true,
            auth :{
                user : process.env.NODEMAILER_EMAIL,
                pass : process.env.NODEMAILER_PASSWORD
            }
        });

        // Email content
        const info = await transporter.sendMail({
            from : process.env.NODEMAILER_EMAIL,
            to : email,
            subject : "Verify your account",
            text : `Your OTP : ${otp}`,
            html : `<b>Your OTP : ${otp}</b>`
        })

        return info.accepted.length > 0;

    } catch (error) {

        console.error("Email failed to send", error);
        return false;

    }
}


// Create a new user
const signup = async (req, res) => {
    try {
        
        const {email, password, cPassword} = req.body;

        // Check oassword is match
        if (password !== cPassword) {
            return res.render("signup", {message : "Password do not match"});
        }

        // Check the email is unique
        const findUser = await User.findOne({email});
        if (findUser) {
            return res.render("signup", {message : "User with this email already exists"});
        }

        const otp = generateOtp();

        const emailSend = await sendVerificationEmail(email, otp);

        if (!emailSend) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;   // OTP store in to session for verification
        req.session.userData = {email, password};

        // res.render("Verify-otp");
        console.log("OTP Send : ", otp);

    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
        
    }
}





module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
}