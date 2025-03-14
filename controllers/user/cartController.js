const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
// const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const { render } = require("ejs");








const getCartPage = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await User.findById(userId);
      
      if (!user.cart || user.cart.length === 0) {
        // No cart, render empty cart page
        return res.render("cart", {
          user,
          quantity: 0,
          data: [],
          grandTotal: 0
        });
      }

      // Find and populate the cart
      const cart = await Cart.findOne({ _id: { $in: user.cart } })
        .populate('items.productId');
    //   console.log("cart:", cart);

      if (!cart) {
        return res.render("cart", {
          user,
          quantity: 0,
          data: [],
          grandTotal: 0
        });
      }
      
      // Format data for the view (to match your existing template)
      const data = cart.items.map(item => {
        return {
          quantity: item.quantity,
          productDetails: [{
            _id: item.productId._id,
            id: item.productId._id,
            productName: item.productId.productName,
            category: item.productId.category,
            brand: item.productId.brand,
            salePrice: item.productId.salePrice,
            productImage: item.productId.productImage,
            quantity: item.productId.quantity // product's available quantity
          }]
        };
      });
      
      // Calculate total quantity and grand total
      let quantity = 0;
      let grandTotal = 0;
      
      for (const item of cart.items) {
        quantity += item.quantity;
        grandTotal += item.totalPrice;
      }
      
      req.session.grandTotal = grandTotal;
      
      res.render("cart", {
        user,
        quantity,
        data,
        grandTotal
      });
      
    } catch (error) {
      console.error(error);
      res.redirect("/pageNotFound");
    }
  };



const addToCart = async (req, res) => {
    try {
      const productId = req.body.productId;
      const count = req.body.count;
      console.log("count:", count)
      const userId = req.session.user;
      if(!userId) {
        return res.json({ status: false, message: "Please login" });
      }

      const user = await User.findById(userId);
      const product = await Product.findById(productId).lean();
      
      if (!product) {
        return res.json({ status: false, message: "Product not found" });
      }
      
      if (product.quantity <= 0) {
        return res.json({ status: false, message: "Out of stock" });
      }
  
      // Check if user already has a cart
      let userCart;
      
      // If user has cart references
      if (user.cart && user.cart.length > 0) {
        // Get the user's cart document
        userCart = await Cart.findOne({ _id: { $in: user.cart } });
      }
      
      // If no cart exists for the user, create one
      if (!userCart) {
        userCart = new Cart({
          userId: userId,
          items: [{
            productId: productId,
            quantity: 1,
            price: product.salePrice,
            totalPrice: product.salePrice
          }]
        });
        
        // Save the new cart
        const savedCart = await userCart.save();
        
        // Add cart reference to user
        await User.findByIdAndUpdate(userId, {
          $push: { cart: savedCart._id }
        });
        
        return res.json({ 
          status: true, 
          cartLength: 1, 
          user: userId 
        });
      } else {
        // Cart exists, check if product already in items array
        const itemIndex = userCart.items.findIndex(item => 
          item.productId.toString() === productId.toString()
        );
        
        if (itemIndex === -1) {
          // Product not in cart, add it
          userCart.items.push({
            productId: productId,
            quantity: 1,
            price: product.salePrice,
            totalPrice: product.salePrice
          });
        } else {
          // Product already in cart, update quantity if stock allows
          if (userCart.items[itemIndex].quantity < product.quantity) {
            userCart.items[itemIndex].quantity += 1;
            userCart.items[itemIndex].totalPrice = 
              userCart.items[itemIndex].price * userCart.items[itemIndex].quantity;
          } else {
            return res.json({ status: false, message: "Out of stock" });
          }
        }
        
        // Save the updated cart
        await userCart.save();
        
        return res.json({ 
          status: true, 
          cartLength: userCart.items.length, 
          user: userId 
        });
      }
    } catch (error) {
      console.error(error);
      return res.redirect("/pageNotFound");
    }
  };


  const changeQuantity = async (req, res) => {
    try {
      const productId = req.body.productId;
      const userId = req.session.user;
      const count = parseInt(req.body.count); // +1 or -1
      
      // Find the user's cart
      const user = await User.findById(userId);
      if (!user.cart || user.cart.length === 0) {
        return res.json({ status: false, message: "No cart found" });
      }
      
      const cart = await Cart.findOne({ _id: { $in: user.cart } });
      if (!cart) {
        return res.json({ status: false, message: "No cart found" });
      }
      
      // Find the product in the cart items
      const itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId.toString()
      );
      
      if (itemIndex === -1) {
        return res.json({ status: false, message: "Product not found in cart" });
      }
      
      // Get product for stock check
      const product = await Product.findById(productId);
      if (!product) {
        return res.json({ status: false, message: "Product not found" });
      }
      
      // Calculate new quantity
      const newQuantity = cart.items[itemIndex].quantity + count;
      
      // Validate new quantity
      if (newQuantity <= 0) {
        return res.json({ status: false, message: "Quantity cannot be less than 1" });
      }
      
      if (count > 0 && newQuantity > product.quantity) {
        return res.json({ status: false, message: "Out of stock" });
      }
      
      // Update quantity and total price
      cart.items[itemIndex].quantity = newQuantity;
      cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * newQuantity;
      
      // Save cart
      await cart.save();
      
      // Calculate grand total
      let grandTotal = 0;
      for (const item of cart.items) {
        grandTotal += item.totalPrice;
      }
      
      return res.json({
        status: true,
        quantityInput: newQuantity,
        count: count,
        totalAmount: cart.items[itemIndex].totalPrice,
        grandTotal: grandTotal
      });
      
    } catch (error) {
      console.error(error);
      return res.redirect("/pageNotFound");
    }
  };



  const deleteProduct = async (req, res) => {
    try {
      const productId = req.query.id;
      const userId = req.session.user;
      
      // Find user's cart
      const user = await User.findById(userId);
      if (!user.cart || user.cart.length === 0) {
        return res.redirect("/cart");
      }
      
      const cart = await Cart.findOne({ _id: { $in: user.cart } });
      if (!cart) {
        return res.redirect("/cart");
      }
      
      // Find product index in items array
      const itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId.toString()
      );
      
      if (itemIndex > -1) {
        // Remove the item from items array
        cart.items.splice(itemIndex, 1);
        
        // Save the cart
        await cart.save();
        
        // If cart is empty, you might want to delete it
        if (cart.items.length === 0) {
          await Cart.findByIdAndDelete(cart._id);
          await User.findByIdAndUpdate(userId, {
            $pull: { cart: cart._id }
          });
        }
      }
      
      res.redirect("/cart");
    } catch (error) {
      console.error(error);
      res.redirect("/pageNotFound");
    }
  };





module.exports = {
  getCartPage,
  addToCart,
  changeQuantity,
  deleteProduct,
};


