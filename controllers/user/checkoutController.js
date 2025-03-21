const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const { v4: uuidv4 } = require('uuid');






const getCheckoutPage = async (req, res) => {
    try {
        
        const userId = req.session.user || req.query.userId;
        if (!userId) {
          return res.redirect("/login"); 
      }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        };

        let grandTotal = req.session.grandTotal
        const cart = await Cart.findOne({_id: {$in: user.cart}}).populate("items.productId");

        const cartData = cart.items.map((item) => {
          return {
            quantity: item.quantity, //Product quantity in cart
            _id: item.productId._id,
            productName: item.productId.productName,
            salePrice: item.productId.salePrice,
            productImage: item.productId.productImage,
            color: item.productId.color,
            productQuantity: item.productId.quantity,
            totalPrice: item.quantity * item.productId.salePrice
          }
        })

        const userAddress = await Address.findOne({userId: userId}).select("address");

        const notDefaultAddress = userAddress 
        ? userAddress.address.filter((addr) => addr.isDefault === false) : null;  

        // console.log("notDefaultAddress :", notDefaultAddress);

        // Only default address
        const defaultAddress = userAddress 
          ? userAddress.address.find((addr) => addr.isDefault) : null;  

        const cartItems = cart ? cart.items : [];
        // console.log(userAddress.address[0].name)

        res.render("checkout",{
            user,
            cartItems,
            addresses : userAddress ? userAddress.address : [],
            defaultAddress: defaultAddress || {} ,
            userAddress,
            notDefaultAddress,
            cartData,
            grandTotal,
        })

    } catch (error) {

        console.error("Error in get checkout page", error);
        res.redirect("/pageNotFound");
        
    };
};




const updateDefaultAddress = async (req, res) => {
    try {
      const { addressId } = req.body;
      const userId = req.session.user;
  
      if (!userId) {
        return res.status(401).json({ 
          status: false, 
          message: "User is not authenticated" 
        });
      }
  
      // Reset all addresses to non-default
      await Address.updateMany(
        { userId: userId },
        { $set: { "address.$[].isDefault": false } }
      );
  
      // Set the selected address as default
      const updatedAddress = await Address.updateOne(
        { userId: userId, "address._id": addressId },
        { $set: {"address.$.isDefault": true} }
      );
  
      if (updatedAddress.modifiedCount === 0) {
        return res.status(400).json({
            status: false,
            message: "Address not found or already set as default",
        });
      }

      // Get the updated address details to send back to client
      const userAddresses = await Address.findOne({ userId: userId });
      const selectedAddress = userAddresses.address.find(
          addr => addr._id.toString() === addressId
      );
  
      res.status(200).json({
        status: true,
        message: "Default address updated successfully" ,
        selectedAddress: selectedAddress
      });

    } catch (error) {
      console.error("Error updating default address:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  };
  

// Get edit address page and go to address management function
const getEditCheckoutAddress = async (req, res) => {
  try {

    const addressId = req.query.id;
    const user = req.session.user;
    const userData = await User.findById(user);
    const currentAddress = await Address.findOne({"address._id": addressId});

    if (!currentAddress) {
      console.log("Current address not found", currentAddress);
      return res.status(404).json({
        status: false,
        message: "Address Not Found"
      })
    }

    // Find taht address data in address array
    const addresData = currentAddress.address.find((item) => {
      return item._id.toString() === addressId.toString();
    });

    if (!addresData) {
      return res.status(404).json({
        status: false,
        message: "Address Not Found."
      })
    };

    res.render("edit-checkout-address", {
      userAddress: addresData,
      user: userData || user,
    });
    
  } catch (error) {

    console.error("Error in Get edit address", error);
    res.redirect("/pageNotFound");
      
  }
};


// Load Add Address page and go to address management 
const getaddCheckoutAddress = async (req, res) => {
  try {

      const user = req.session.user;

      res.render("add-address", {
        user: user
      });
      
  } catch (error) {

      console.error("Error in Get address page", error);
      res.redirect("/pageNotFound");
      
  }
};



// COD Payment
const codPlaceOrder = async (req, res) => {
  try {

    // Receive data from frondend
    const {
      orderItems, 
      addressId,
      totalPrice,
      discount,
      finalAmount,
      status,
      paymentMethod,
    } = req.body;

    // console.log(
    //   `orderData for cod:  
    //   orderItems: ${orderItems}, 
    //   addressId ${addressId},
    //   totalPrice: ${totalPrice},
    //   discount: ${discount},
    //   finamAmount: ${finalAmount},
    //   status: ${status},
    //   paymentMethod: ${paymentMethod}`
    // );

    const userId = req.session.user;

    const userData = await User.findOne({_id: userId});

    const userAddress = await Address.find({userId: userData._id});
    if (!userAddress || userAddress.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No address found"
      });
    }

    const defaultAddress = userAddress
    .flatMap((addr) => addr.address)
    .find((addr) => addr.isDefault === true);
    // console.log("defaultAddress :", defaultAddress);
    
    if (!defaultAddress) {
      return res.status(400).json({
        status: false,
        message: "No default address found",
      })
    };

    const newOrder = new Order({
      orderId: uuidv4(),
      userId: userData._id,
      orderItems,
      totalPrice,
      finalAmount,
      address: defaultAddress._id || addressId,
      status: status || "Order Placed",
      createdOn: new  Date(),
      discount,
      paymentMethod: paymentMethod || "COD",
    });
    console.log("newOrder :", newOrder);

    const savedOrder = await newOrder.save();

    for (const item of orderItems) {
      console.log('orderItems.product:', item.product);
      const productId = item.product;
      const orderedQuantity = item.quantity;

      const product = await Product.findById(productId);
      if (product) {

        if (product.quantity < orderedQuantity) {
          return res.status(400).json({
            staus: false,
            message: `Not enough stock for product ${product.productName}`,
          });
        }
        product.quantity -= orderedQuantity;
        await product.save();
  
      }
     
    };

    // Remove items from cart after order is placed
    await Cart.findOneAndUpdate(
      {userId: userData._id},
      {$pull: 
        {
          items: {
            productId: { $in: orderItems.map((item) => item.product)},
          }
        }
      }
    )

    // After processing the order successfully
    return res.status(200).json({
      status: true,
      message: "Order placed successfully!",
      orderId: savedOrder.orderId
    });
    
  } catch (error) {
    
    console.error("Error in COD  place order", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    })

  }
};



// Load Order success page
const getOrderSuccess = async (req, res) => {
  try {

    const orderId = req.query.orderId;
    const userId = req.session.user;

    const userData = await User.findById(userId).select('name email');
    console.log("userData :", userData);

    const cart = await Cart.findOne({userId: userData._id});

    const cartItems = cart ? cart.items : [];

    const order = await Order.findOne({orderId: orderId})
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    };

    res.render("order-success", {
      order,
      status: true,
      message: "Your order has been successfully placed!",
      user: userData,
      cartItems,
    });
    
  } catch (error) {
    
    console.error("Error in get order success", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
    
  }
};





module.exports = {
    getCheckoutPage,
    updateDefaultAddress,
    getEditCheckoutAddress,
    getaddCheckoutAddress,
    codPlaceOrder,
    getOrderSuccess,
}