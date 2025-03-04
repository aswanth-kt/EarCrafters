const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");






const productDetails = async (req, res) => {
    try {

        const user = req.session.user;
        const userData = await User.findById(user);

        const productId = req.query.id;
        const product = await Product.findById(productId).populate("category");
        const findCategory = product.category;;
        const categoryOffer = findCategory ? findCategory.categoryOffer : 0;
        const productOffer = product ? product.productOffer : 0;
        const totalOffer = categoryOffer + productOffer;

        res.render("product-details", {
            userData: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory
        })
        
    } catch (error) {
        
        console.error("Error in product details", error);
        res.redirect("/pageNotFound");
        
    }
};






module.exports = {
    productDetails,
}