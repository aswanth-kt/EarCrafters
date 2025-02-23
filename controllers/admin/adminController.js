const User = require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');





// Admin page error
const pageError = async (req, res) => {
    
    res.render("admin-error");

};



// Login page
const loadLogin = async (req, res) => {
    try {
        
        if (req.session.admin) {        //How to know this admin is in session?
            return res.redirect("/admin/dashboard");
        }

        return res.render("admin-login", {message : null});

    } catch (error) {
        
        console.error("Dashboard page not found", error);
        res.status(500).send("Server error");

    }
}



const login = async (req, res) => {
    try {

        const {email, password} = req.body;
        const admin = await User.findOne({email : email, isAdmin : true});
        if (admin) {

            const passwordMatch = await bcrypt.compare(password, admin.password);
            
            if (passwordMatch) {
                
                req.session.admin = true;
                return res.redirect("/admin"); //admin-dashboard

            } else {

                return res.redirect("/admin/login");
                
            }

        } else {
            
            return res.redirect("/admin/login");

        }
        
    } catch (error) {

        console.error("Admin login error", error);
        return res.redirect("/admin/pageerror");
        
    }
};



const loadDashboard = async (req, res) => {

    if (req.session.admin) {

        try {

            res.render("dashboard");
        
        } catch (error) {

            console.error("Error at render dashboard");
            res.redirect("/admin/pageerror");
            
        }

    }
    
};



const adminLogout = async (req, res) => {
    try {

        req.session.destroy(err => {
            if (err) {

                console.error("Error at destroying session", err);
                res.redirect("/admin/pageerror");
                
            }

            res.redirect("/admin/login");

        })
        
    } catch (error) {

        console.error("Unexpected error during logout", error);
        res.redirect("/admin/pageerror");
        
    }
}





module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    adminLogout,
}