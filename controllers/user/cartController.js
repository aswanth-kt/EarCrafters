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
      // console.log("cart:", cart);

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
      // console.log("count:", count)
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
          items: [
            {
              productId: product._id,
              quantity: 1,
              price: product.salePrice,
              totalPrice: product.salePrice
            },
          ]
        });
        
        // Save the new cart
        const savedCart = await userCart.save();
        
        // Add cart reference to user
        await User.findByIdAndUpdate(userId, {
          $push: { cart: savedCart._id }
        });

        // If add to cart remove the product from wishlist
        const index = user.wishlist.indexOf(productId);   // find index that product in wishlist array
        user.wishlist.splice(index, 1)  // Remove the product from wishlist array
        await user.save();
        
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
          user: userId,
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



// Update product quantity from product details
const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user;

    if (!productId || !quantity || !userId) {
      console.log("ProductId, Quantity, or userId is not found");
      return res.status(400).json({
        success: false, 
        message: "Something went wrong"
      });
    }

    // Check if the product exists and is available
    const product = await Product.findOne(
      { _id: productId, isBlock: false, isSoftDelete: false }
    );
    
    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Product not found or unavailable"
      });
    }

    if (quantity > 5) {
      return res.status(400).json({
        success: false,
        message: "Cannot add more than 5 of this product"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    // Get all user's carts
    let userCarts = await Cart.find({ userId });
    // let userCarts = await Cart.find({ _id: { $in: user.cart } });
    console.log("User Carts :", userCarts)
    
    // Find if this product is already in any of the user's carts
    let existingCartWithProduct = null;
    let itemIndex = -1;
    
    for (const cart of userCarts) {
      const index = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );
      if (index > -1) {
        existingCartWithProduct = cart;
        itemIndex = index;
        break;
      }
    }

    let updatedCart;
    
    if (existingCartWithProduct) {
      // Update existing cart item
      existingCartWithProduct.items[itemIndex].quantity = quantity;
      existingCartWithProduct.items[itemIndex].totalPrice = 
        existingCartWithProduct.items[itemIndex].price * quantity;  
      
      updatedCart = await existingCartWithProduct.save();
    } else {
      // Create new cart if user has no carts yet
      if (userCarts.length === 0) {
        const newCart = await Cart.create({
          userId: userId,
          items: [
            {
              productId,
              quantity,
              price: product.salePrice,
              totalPrice: product.salePrice * quantity,
            },
          ],
        });
        
        // Add new cart to user's cart array
        user.cart.push(newCart._id);
        await user.save();
        
        updatedCart = newCart;
      } else {
        // Add new item to first cart
        const firstCart = userCarts[0];
        firstCart.items.push({
          productId,
          quantity,
          price: product.salePrice,
          totalPrice: product.salePrice * quantity,
        });
        
        updatedCart = await firstCart.save();
      }
    }
    
    // Calculate total cart amount
    const totalAmount = updatedCart.items.reduce(
      (sum, item) => sum + item.totalPrice, 0
    );

    res.status(200).json({
      success: true,
      cartData: {
        items: updatedCart.items,
        totalAmount: totalAmount,
      },
    });
    
  } catch (error) {

    console.error("Error in update cart quantity", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
};







module.exports = {
  getCartPage,
  addToCart,
  changeQuantity,
  deleteProduct,
  updateCartQuantity,
};


