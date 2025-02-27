const User = require("../models/userSchema");

const loginMiddleware = (req, res, next) => {
    try {

        if (req.session.user_id) {
            console.log(req.session.user_id);
            
            return res.redirect('/');
        } else {
            
            next();
        }
        
    } catch (error) {
        console.error("User middleware error", error.message);
        
    }
    
};




const CheckBlockedUser = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        // console.log(userId);
        
        if (userId) {
            const findUser = await User.findById(userId);

            if (findUser && findUser.isBlock) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                        return res.status(500).json({ message: "Internal server error" });
                    }
                    res.render("login",{message: "User is blocked by admin."});
                });
                return;
            }
        }

        next();
    } catch (error) {
        console.error("Error at check block user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};




module.exports = loginMiddleware;
module.exports = CheckBlockedUser;