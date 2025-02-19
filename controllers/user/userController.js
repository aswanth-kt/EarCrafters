
const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const bcrypt = require('bcrypt');



//Page not found 404
const pageNotFound = async (req, res) => {
    try {

        res.render("page-404");
        
    } catch (error) {

        res.redirect("pageNotFound");
        
    }
}

// const pageNotFound = async (req, res) => {
//     try {

//         return res.status(404).render("page-404");
        
//     } catch (error) {
//         res.redirect("/pageNoteFound")
//         res.status(404).send("400 page Not Found");
//     }
// }




const loadHomepage = async (req, res) => {
    try {

        return res.render("home");
        
    } catch (error) {

        console.log("Home page not found");
        res.status(500).send("Server error");
    }
};





// Load signup page
const loadSignup = async (req, res) => {
    try {
        
        return res.render("signup", {message : null});

    } catch (error) {
        
        console.log("Home page not loading" , error);
        res.status(500).send("Server error");
    }
}




// To generate OTP
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}



// For send a email
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
        
        const {name, phone, email, password, cPassword} = req.body;

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

        // Add data to session
        req.session.userOtp = otp;   // OTP store in to session for verification
        req.session.userData = {name, phone, email, password};

        

        res.render("verify-otp", {email : req.session.userData.email});
        console.log("OTP Send : ", otp);

    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
        
    }
};




// Convert to Has Password
const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;

    } catch (error) {

        console.log("Error at Hash Password ", error);
        
    }
}




const verifyOtp = async (req, res) => {
    try {
        
        const {otp} = req.body;
        console.log(otp);

        // Check user input otp and session otp
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            // Create a new user
            const saveUserData = new User({
                name : user.name,
                email : user.email,
                phone : user.phone,
                password : passwordHash
            })

            await saveUserData.save();      // Save user data to DB

            req.session.user_id = saveUserData._id;    //Store user id for authorization

            // Clear OTP and user data from session
            delete req.session.userOtp;
            delete req.session.userData;

            res.json({success : true, redirectUrl : "/"});
        } else {
            res.status(400).json({success : false, message : "Invalid OTP, Please try again"});
        }

    } catch (error) {
        
        console.error("Error verifying OTP ", error);
        res.status(500).json({success : false, message : "An error occured"});
        
    }
};




const resendOtp = async (req, res) => {
    try {

        const {email} = req.session.userData;
        

        if (!email) {
            return res.status(400).json({success : false, message: "User data or email missing"});
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSend = await sendVerificationEmail (email, otp);

        if (emailSend) {
            
            console.log("Resend OTP :", otp);
            
            res.status(200).json({success : true, message : "OTP Resend Successfully"});
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to resend otp Please try again",
              });
        }
        
    } catch (error) {
        console.error("Error resending OTP", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error." });
    }
};




// Login page load
const loadLogin = async (req, res) => {
    try {
        
        if (!req.session.user) {
            return res.render("login", {message : null});
        } else {
            res.redirect("/")
        }

    } catch (error) {
        
        res.redirect("/pageNotFound");
    }
}



const login = async (req, res) => {
    try {
        const {email, password} = req.body;

        const findUser = await User.findOne({isAdmin : 0, email : email})

        if (!findUser) {
            return res.render("login", {message : "User not found."});
        }

        if (findUser.isBlocked) {
            return res.render("login", {message : "User is blocked by admin."});
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("login", {message : "Incorrecte credentials"});
        }

        req.session.user = findUser._id;
        res.redirect("/")

    } catch (error) {

        console.error("Login error", error);
        res.render("login", {message : "Login failed. Please try later."});
        
    }
}







module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
};