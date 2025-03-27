const User = require("../models/userSchema");



// // User authentication
// const userAuth = (req, res, next) => {

//     // If no user session exists, allow access (non-logged-in users can view home)
//     if (!req.session.user) {
//         return next();
//     }

//     if (req.session.user) {

//         User.findById(req.session.user)
//         .then(data => {

//             if (data && !data.isBlock) {

//                 next();     // Proceed to next

//             } else {

//                 res.redirect("/login");
//             }

//         })
//         .catch(error => {

//             console.error("Error in user auth middleware", error);
//             res.status(500).send("Internal Server Error");
            
//         })

//     } else {

//         res.redirect("/login")

//     }

// };



// User authentication
const userAuth = (req, res, next) => {
    
    // Without login in gust role
    if (!req.session.user) {
        return next();
    }
    
    User.findById(req.session.user)
        .then(data => {
            if (data && !data.isBlock) {

                next();     // Proceed to next

            } else {
                res.redirect("/login");
            }
        })
        .catch(error => {

            console.error("Error in user auth middleware", error);
            res.status(500).send("Internal Server Error");
            
        });
};




// Admin authentication
const adminAuth = (req, res, next) => {
    User.findOne({isAdmin : true})
    .then(data => {
        
        if (data) {

            next();

        } else {

            res.redirect("/admin/login");
        }
    })
    .catch(error => {

        console.error("Error in admin auth middleware",error);
        res.status(500).send("Internal Server Error");
        
    })
};





module.exports = {
    userAuth,
    adminAuth
}