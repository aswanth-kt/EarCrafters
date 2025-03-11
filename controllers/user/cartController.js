const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");





// Load Cart page
const getCartPage = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findById(user);

        const products = await Product.find({_id: {$in: userData.cart}});

        res.render("cart", {
            user: userData,
            products,
        });

    } catch (error) {
        
        console.error(" error in Load Cart page", error);
        res.status(500).redirect("/pageNotFound");

    }
};


const addToCart = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findById(user);

        const productId = req.body.productId;
        // console.log(productId, typeof productId)

        if (userData.cart.includes(productId)) {
            return res.status(200).json({status: false, message: "Product already in cart"});
        };

        userData.cart.push(productId);
        await userData.save();
        return res.status(201).json({status: true, message: "Product added to cart"});
        
    } catch (error) {

        console.error("Error in add to cart", error);
        res.status(500).json({status: false, message: "Internal server error"});
        
    }
};



// Remove product from cart
const removeCartProduct = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findById(user);

        const productId = req.params.productId; 
        console.log(productId)

        // // Find index that product un cart array
        // const productIndex = userData.cart.indexOf(productId);

        // // Remove product cart array
        // userData.cart.splice(productIndex, 1);
        // await userData.save();

        await User.findByIdAndUpdate(user, {
            $pull: {cart: productId}
        });

        return res.status(200).redirect("/cart");
        
    } catch (error) {

        console.error("Error in remove product from Cart", error);
        return res.status(500).redirect("/pageNotFound");
        
    }
};



// Increase Product Qty
const increaseProductQuantity = async (req, res) => {
    try {
        
    } catch (error) {
        
    }
}








module.exports = {
    getCartPage,
    addToCart,
    removeCartProduct,
    increaseProductQuantity,
}