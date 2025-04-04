const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");






const productDetails = async (req, res) => {
    try {
        

        const user = req.session.user;
        const userData = await User.findById(user);

        const productId = req.query.id;
        // console.log("Pro id:", typeof productId)
        const product = await Product.findById(productId).populate("category");
        const findCategory = product.category;;
        const categoryOffer = findCategory ? findCategory.categoryOffer : 0;
        const productOffer = product ? product.productOffer : 0;
        const totalOffer = categoryOffer + productOffer;

        // Fetch related products from the same category
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id } // Exclude current product
        }).limit(4);

        const cart = await Cart.findOne({_id: {$in: userData.cart}}).populate("items.productId");

        const cartItemQty = cart.items.map(item => {
            return {
                quantity: item.quantity
            }
        })

        res.render("product-details", {
            userData: userData,
            user,   //session user for profile name
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
            relatedProducts, //Recomented product
            cartItemQty: cartItemQty || null, //cart qty
        })
        
    } catch (error) {
        
        console.error("Error in product details", error);
        res.redirect("/pageNotFound");
        
    }
};









module.exports = {
    productDetails,
}