const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const evn = require('dotenv').config();
const session = require('express-session');
const { text } = require("express");
const { name } = require("ejs");
const Product = require("../../models/productSchema");






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
            res.render("login", {message: "Password changed!, Please login"})
        } else {
            res.render("reset-password", {message: "Password do not match"});
        }
        
    } catch (error) {

        console.error("Error in Update password");
        res.redirect("/pageNotFound");
        
    }
};



// Load user profile page
const getUserProfilePage = async (req, res) => {
    try {

        const userId = req.session.user;

        if (!userId) {
            console.log("UserId is not found!!");
        };

        const userData = await User.findById(userId);
        const addressData = await Address.findOne({userId: userId});

        // Fetch the Order details with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({userId: userId});

        const orders = await Order.find({userId: userData._id})
        .populate("orderItems.product", "productName productImage")
        .sort({createdOn: -1})
        .skip(skip)
        .limit(limit)
        .exec();

        const totalPages = Math.ceil(totalOrders / limit);

        
        // Fetch Wallet details
        const wallet = await Wallet.findOne({userId: userData._id});
        // console.log("Wallet:", wallet)
        if (!wallet) {
            return res.status(404).json({
                status: false,
                message: "Not found Wallet details"
            })
        };

        res.render("profile", {
            user: userData,
            userAddress: addressData,
            ordersData: orders,
            totalPages,
            currentPage: page,
            wallet: wallet || null,
        })
        
    } catch (error) {

        console.error("Error in get user profile page", error);
        res.redirect("/pageNotFound");
        
    }
};



// Load Edit user profile
const getEditUserProfilePage = async (req, res) => {
    try {

        const userId = req.session.user;
        if (!userId) {
            console.log("User not found");
            return res.redirect("/login");
        }

        const userData = await User.findById(userId);

        res.render("edit-profile", {
            user: userData
        });
        
    } catch (error) {
        
        console.error("Error in get edit user profile page", error);
        res.redirect("/pageNotFound");
        
    }
}



const editProfile = async (req, res) => {
    try {

        const {fieldName} = req.params;             //name field, email field, phone field
        const fieldValue = req.body[fieldName];     //name value, email value, phone value
        console.log(fieldName, ":", fieldValue);

        const allowFields = ['name', 'email', 'phone'];
        if (!allowFields.includes(fieldName)) {
            return res.status(400).json({
                status: false,
                message: "Invalid field name"
            })
        };

        const userId = req.session.user;

        // Update the specific field
        const updateData = {};
        updateData[fieldName] = fieldValue;

        const updateUser = await User.findByIdAndUpdate(
            userId,
            {$set: updateData},
            {new: true}
        );
        
        if (!updateUser) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            status: true,
            message: "Profile update successfully"
        })

    } catch (error) {
        
        console.error('Error updating profile:', error);
        return res.status(500).json({
            status: false,
            message: 'Server error occurred while updating profile'
        });
    }
}




// Load Email page
const loadChangeEmailPage = async (req, res) => {
    try {
        console.log("User session at load email: ", req.session.user)
        return res.render("change-email", {
            message: null, 
            user: req.session.user
        });
        
    } catch (error) {
        
        console.error("Error in load change email", error);
        return res.redirect("/pageNotFound");
        
    }
};



// Verify Email send OTP
const changeEmailValid = async (req, res) => {
    try {

        const {email} = req.body;
        const userExists = await User.findOne({email: email});

        if (userExists && userExists.email === email) {

            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;                                
                req.session.email = email;

                // console.log("userOtp: ",req.session.userOtp);
                // console.log("userData: ", req.session.userData);
                // console.log("email: ", req.session.email);

                res.render("change-email-otp", {user: req.session.user});

                console.log(`Change email otp send to ${email},
                    OTP is ${otp}`);
                
            } else {
                res.render("change-email",{message: " Error in Email sending"});
            }

        } else {
            res.render("change-email", {message: "Email not found!, Please verify email id"});
        }
        
    } catch (error) {

        console.error("Error in change email valid", error);
        res.redirect("/pageNotFound");
        
    }
};



const verifyChangeEmailOtp = async (req, res) => {
    try {

        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            // req.session.userData = req.body.userData;  

            res.render("new-email", {user: req.session.user});
        } else {
            res.render("change-email-otp", {
                message: "OTP not maching...",
                userData: req.session.userData
            });
        }
        
    } catch (error) {

        console.error("Error in Verify change email Otp", error);
        res.redirect("/pageNotFound");
        
    }
};




// Generate OTP and send to new email
const updateEmail = async (req, res) => {
    try {

        const newEmail = req.body.newEmail;
        const user = req.session.user;

        if (newEmail && user) {
            const otp = generateOtp();
            const emailSent = sendVerificationEmail(newEmail, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.newEmail = newEmail;
                // req.session.userData = req.body;

                res.render("new-email-otp", {
                    user: req.session.user,
                });

                console.log(`Send to ${newEmail},
                    OTP is ${otp}`);
            }
        }
        
    } catch (error) {

        console.error("Error in Update email", error);
        res.redirect("/pageNotFound");        
        
    }
};


// Verify new email with OTP and update new email
const verifyNewEmail = async (req, res) => {
    try {

        const user = req.session.user;
        const enteredOtp = req.body.otp;
        const newEmail = req.session.newEmail;
        console.log("new email:", newEmail, " user:", user)

        if (req.session.userOtp === enteredOtp) {
            await User.findByIdAndUpdate(
                user, 
                {email: newEmail},
                {new: true},
            );

            res.redirect("/userProfile#profile");
        } else {
            return res.render("new-email-otp", {
                user: req.session.user,
                message: "OTP is not maching...",
            })
        }
        
    } catch (error) {

        console.error("Error in verify new email", error);
        res.redirect("/pageNotFound");

    }
}




// Load password change page at profile
const loadChangePasswordPage = async (req, res) => {
    try {

        res.render("change-password", {user: req.session.user});
        
    } catch (error) {

        console.error("Error in load change password page", error);
        res.redirect("/pageNotFound");
        
    }
};




const changePasswordValid = async (req, res) => {
    try {

        const {email} = req.body;

        const userExists = await User.findOne({email: email});
        if (userExists && userExists.email === email) {

            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;

                res.render("change-password-otp");
                console.log("Change password OTP: ", otp);
                
            } else {
                res.status(400).json({success: false, message: " Error in Email sending"});
            }
        } else {
            res.render("change-password",{message: " Email not found!, please try again"});
        }
        
    } catch (error) {
        
        console.error("Error in change password valid", error);
        res.redirect("/pageNotFound");
        
    }
};




// veryfy OTP
const verifyChangePassOtp = async (req, res) => {
    try {

        const enteredOtp = req.body.otp;

        if (enteredOtp === req.session.userOtp) {
            res.status(200).json({success: true, redirectUrl: "/reset-password"});
        } else {
            res.status(400).json({success: false, message: "OTP is not match"});
        }
        
    } catch (error) {
        
        console.error("Error in verify change pass OTP", error);
        res.status(500).json({success: false, message: "Internal server error"});
        
    }
};



// Load Add Address page
const getAddAddressPage = async (req, res) => {
    try {

        const user = req.session.user;

        res.render("add-address", {user: user});
        
    } catch (error) {

        console.error("Error in Get address page", error);
        res.redirect("/pageNotFound");
        
    }
};


//  Add new address
const postAddAddress = async (req, res) => {
    try {

        const userId = req.session.user
        const userData = await User.findById(userId);

        const {addressType, name, city, landMark, state, pincode, phone, altPhone} = req.body;

        const userAddress = await Address.findOne({userId: userData._id});

        if (!userAddress) {
            // There is no address create a new address.
            const newAddress = new Address({
                userId: userData._id,
                address: [{
                    addressType,
                    name, 
                    city, 
                    landMark, 
                    state, 
                    pincode, 
                    phone, 
                    altPhone,
                }]
            });
            await newAddress.save();

        } else {
            // Append the address
            userAddress.address.push({
                addressType, name, city, landMark, state, pincode, phone, altPhone
            });
            await userAddress.save();
        }

        res.redirect("/userProfile#address");
        
    } catch (error) {
        
        console.error("Error in Post Add Address", error);
        res.redirect("/pageNotFound");

    }
};



// Load Edit address page
const getEditAddress = async (req, res) => {
    try {

        // const redirectToUserProfile = "/userProfile";
        // const redirectToCheckout = "/checkout";

        const addressId = req.query.id;
        const user = req.session.user;
        const userData = await User.findById(user);
        const currentAddress = await Address.findOne({"address._id": addressId});
        // console.log("current add: ", currentAddress)
        if (!currentAddress) {
            return res.redirect("/pageNotFound")
        }

        // Find taht address data in address array
        const addresData = currentAddress.address.find((item) => {
            return item._id.toString() === addressId.toString();
        });

        if (!addresData) {
            return res.redirect("/pageNotFound");
        };

        res.render("edit-address", {
            userAddress: addresData,
            user: userData || user,
            // redirectToCheckout,
            // redirectToUserProfile,
        });
        
    } catch (error) {

        console.error("Error in Get edit address", error);
        res.redirect("/pageNotFound");
        
    }
};




const postEditAddress = async (req, res) => {
    try {

        // Receive user input data from frondend
        const inputData = req.body;
        console.log("formData :", inputData);

        const userId = req.session.user;
        const userData = await User.findById(userId);

        const addressId = inputData.addressId || req.query.addressId;
        console.log("addressId :", addressId);

        if (req.query.comeIn) {
            redirectToCheckout = "/checkout";
        } else {
            redirectToUserProfile = "/userProfile#address";
        }

        const findAddress = await Address.findOne({"address._id": addressId});
        if (!findAddress) {
            return res.status(404).json({
                status: false,
                message: "Address Not Found",
            })
        }

        // Check if the same pincode exists in another address
        const addressExists = await Address.findOne({
            "address.pincode": inputData.pincode,
            "address._id": { $ne: addressId },
            userId: userData._id,
        });
      
        if (addressExists) {
            return res.status(401).json({
                success: false,
                message: "This pincode is already associated with another address",
            });
        };

        const isDefault = inputData.isDefault === true;
        if (isDefault) {
            await Address.updateMany(
                {userId: userData._id, "address.isDefault": true},
                {$set: {
                    "address.$.isDefault": false    // Set other addresses' isDefault to false
                }}
            )
        };

        await Address.updateOne(
            {"address._id": addressId},
            {$set: {
                "address.$": {
                    _id: addressId,
                    addressType: inputData.addressType,
                    name: inputData.name,
                    city: inputData.city,
                    landMark: inputData.landMark,
                    state: inputData.state,
                    pincode: inputData.pincode,
                    phone: inputData.phone,
                    altPhone: inputData.altPhone,
                    isDefault: isDefault,
                }
            }}
        )

        res.status(200).json({
            status: true,
            message: "Address updated successfully",
        })
        
    } catch (error) {
        
        console.error("Error in post edit address", error);
        res.status(500).json({
            status: false,
            message: "Internal server error"
        })
    }
}



// Delete address
const deleteAddress = async (req, res) => {
    try {

        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id": addressId});

        if (!findAddress) {
            return res.status(404).send("Address not found");
        }

        // Delete the address in the address array
        await Address.updateOne({"address._id": addressId},
            {$pull: {
                address: {
                    _id: addressId
                }
            }}
        );

        res.redirect("/userProfile#address");
        
    } catch (error) {
        
        console.error("Error in Delete address", error);
        res.redirect("/pageNotFound");
        
    }
};






module.exports = {
    getForgotPasswordPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    updatePassword,

    getUserProfilePage,
    getEditUserProfilePage,
    editProfile,
    loadChangeEmailPage,
    changeEmailValid,
    verifyChangeEmailOtp,
    updateEmail,
    verifyNewEmail,
    loadChangePasswordPage,
    changePasswordValid,
    verifyChangePassOtp,
    getAddAddressPage,
    postAddAddress,
    getEditAddress,
    postEditAddress,
    deleteAddress,
}