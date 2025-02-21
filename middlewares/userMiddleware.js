

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



module.exports = loginMiddleware;