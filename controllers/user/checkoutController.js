const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Counter = require("../../models/counterSchema");  // For Generate OrderId last Digit
const Wallet = require("../../models/walletSchema");
const Transaction = require("../../models/transactionSchema");
const Coupon = require("../../models/couponSchema");
const nodeMailer = require('nodemailer');
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});









// Generate OrderId
const generateOrderId = async () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    // Find and update the counter atomically
    let counter = await Counter.findOneAndUpdate(
        { name: 'orderId' },
        { $inc: { lastOrderNumber: 1 } }, // Increment order number
        { new: true, upsert: true } // Create if doesn't exist
    );

    const orderId = `#ORD-${day}${month}${year}-${counter.lastOrderNumber}`;
    return orderId;
};





// Function Confirmation email
const sendOrderConfirmationEmail = async (email, order, defaultAddress) => {
  try {

    const productIds = order.orderItems.map((item) => item.product);
    const products = await Product.find({_id: {$in: productIds}});

    const productMap = {};
    products.forEach((product) => {
      productMap[product._id] = product.productName;
    });

    const orderItems = order.orderItems
    .map(
      (item) => 
      `<tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${productMap[item.product]}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
      <tr>`
    )
    .join("");

    const totalAmount = order.finalAmount;
    const discount = order.discount;
    const paymentMethod = order.paymentMethod.toUpperCase() || "Cash On Delivery (COD)";

    const deliveryAddress = `
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #2c3e50; margin-bottom: 15px;">Delivery Address</h3>
    <p style="margin: 5px 0;"><strong>${defaultAddress.name}</strong></p>
    <p style="margin: 5px 0;">${defaultAddress.city}, ${defaultAddress.state} - ${defaultAddress.pincode}</p>
    <p style="margin: 5px 0;">Phone: ${defaultAddress.phone}</p>
    ${
      defaultAddress.altPhone
        ? `<p style="margin: 5px 0;">Alternate Phone: ${defaultAddress.altPhone}</p>`
        : ""
    }
    </div>
    `;

    const emailContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <!-- Header -->
      <div style="text-align: center; padding: 30px 0; background-color:rgb(76, 152, 175); color: white; border-radius: 10px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Order Confirmed!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for shopping with EarCrafters</p>
      </div>

      <!-- Order ID and Welcome Message -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #2c3e50; font-size: 20px; margin-bottom: 15px;">Order ID: ${order.orderId}</h2>
        <p style="font-size: 16px; line-height: 1.6;">Dear ${defaultAddress.name},</p>
        <p style="font-size: 16px; line-height: 1.6;">We're thrilled to confirm your order! Below are your order details:</p>
      </div>

      <!-- Payment Method -->
      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
        <p style="margin: 0;"><strong>Payment Method:</strong> ${paymentMethod}</p>
      </div>

      <!-- Order Items -->
      <div style="margin-bottom: 30px;">
        <h3 style="color: #2c3e50; margin-bottom: 15px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f5f6fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px; text-align: right; font-weight: solid;">Discount:</td>
              <td style="padding: 15px; text-align: right; font-weight: solid;">₹${discount}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold;">Total Amount:</td>
              <td style="padding: 15px; text-align: right; font-weight: bold;">₹${totalAmount}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Delivery Address -->
        ${deliveryAddress}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
        <p style="margin: 0; color: #666; font-size: 14px;">Thank you for choosing EarCrafters!</p>
        <div style="margin-top: 20px;">
          <p style="margin: 5px 0; color: #666; font-size: 14px;">Best regards,</p>
          <p style="margin: 5px 0; color:rgb(73, 171, 210); font-weight: bold; font-size: 16px;">EarCrafters Team</p>
        </div>
      </div>
    </div>
    `;

    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.envNODEMAILER_EMAIL,
      to: email,
      subject: "Order Confirmation - Thank you for your purchase!",
      html: emailContent,
    });

    return info.accepted.length > 0;
    
  } catch (error) {

    console.error("Error in sending mail", error);
    throw new Error("Failed to send confirmation email");
    
  }
}





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

        // Fetch Coupons for show at checkout
        const coupons = await Coupon.find({});

        // Check the coupons are valid date
        const currentDate = new Date();
        const validCoupons = coupons.filter((coupon) => {
          const expiredDate = new Date(coupon.expireOn);
          return expiredDate >= currentDate; 
        });

        if (!validCoupons) {
          return res.status(404).join({
            status: false,
            message: "Coupon not found"
          })
        }

        res.render("checkout",{
            user,
            cartItems,
            addresses : userAddress ? userAddress.address : [],
            defaultAddress: defaultAddress || {} ,
            userAddress,
            notDefaultAddress,
            cartData,
            grandTotal,
            coupons: validCoupons,
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
      couponApplied,
    } = req.body;

    // console.log("frondend passing datas: ",req.body);

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

    const orderId = await generateOrderId();  // Generate unique order id

    const newOrder = new Order({
      orderId,
      userId: userData._id,
      orderItems,
      totalPrice,
      finalAmount,
      address: defaultAddress._id || addressId,
      status: status || "Order Placed",
      createdOn: new  Date(),
      discount,
      paymentMethod: paymentMethod || "COD",
      couponApplied,
    });
    // console.log("newOrder :", newOrder);

    const savedOrder = await newOrder.save();
    console.log("Full saved order data:", savedOrder)


    for (const item of orderItems) {
      // console.log('orderItems.product:', item.product);
      const productId = item.product;
      const orderedQuantity = item.quantity;

      const product = await Product.findById(productId)

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
    );

    const userEmail = userData.email;
    const emailSent = await sendOrderConfirmationEmail(
      userEmail,
      savedOrder,
      defaultAddress
    );

    if (!emailSent) {
      return res.status(500).json({
        status: true,
        message: "Failed to send order confirmation mail.",
      });
    };

    // After processing the order successfully
    return res.status(200).json({
      status: true,
      message: "Order placed successfully!",
      orderId: savedOrder._id,
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

    const {orderId} = req.query;
    // console.log("Order id :", orderId, typeof orderId)
    const userId = req.session.user;

    const userData = await User.findById(userId).select('name email');
    // console.log("userData :", userData);

    const cart = await Cart.findOne({userId: userData._id});

    const cartItems = cart ? cart.items : [];

    const order = await Order.findById(orderId).populate("orderItems.product").exec();
    console.log("Order:", order)

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


// Wallet Payment
const walletPlaceOrder = async (req, res) => {
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

    console.log("Body: ", req.body);

    const userId = req.session.user;
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    };

    // Find defalt user address
    const userAddress = await Address.findOne(
      { userId: userData._id, "address.isDefault": true }, 
      { "address.$": 1, _id: addressId } 
    );
  
    if (!userAddress) {
      return res.status(404).json({
        status: false,
        message: "Address not found"
      });
    };

    const wallet = await Wallet.findOne({userId: userData._id});

    if (!wallet) {
      return res.status(404).json({
        status: false,
        message: "Wallet data not found"
      });
    };

    if (!wallet && wallet.balance < finalAmount) {
      return res.status(400).json({
        status: false,
        message: "Insufficient Wallet Balance",
      });
    };

    // Deduct the amount from wallet
    if (wallet.balance >= finalAmount) {
      wallet.balance -= finalAmount;
      await wallet.save();
    } else {
      return res.status(400).json({
        status: false,
        message: "Sorry! Insufficient wallet balance"
      })
    }

    // Create a transaction history
    const transaction = new Transaction({
      userId: userData._id,
      type: "Purchased using wallet - Debit",
      amount: finalAmount,
      balance: wallet.balance,
    });
    await transaction.save();

    // Create order
    const orderId = await generateOrderId();  // Generate unique order id
    const newOrder = new Order({
      orderId,
      userId: userData._id,
      orderItems,
      totalPrice,
      finalAmount,
      address: addressId,
      status: status || "Order Placed",
      createdOn: new  Date(),
      discount,
      paymentMethod: paymentMethod,
    });
    const saveOrder = await newOrder.save();

    // Check product qty and update
    for (const item of orderItems) {
      // console.log('orderItems.product:', item.product);
      const productId = item.product;
      const orderedQuantity = item.quantity;

      const product = await Product.findById(productId)

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
    );

    const userEmail = userData.email;
    const emailSent = await sendOrderConfirmationEmail(
      userEmail,
      saveOrder,
      userAddress
    );

    if (!emailSent) {
      return res.status(500).json({
        status: false,
        message: "Failed to send order confirmation email.",
      });
    };

    return res.status(200).json({
      redirectUrl: "/order-success",
      status: true,
      message: "Order placed successfully!",
      orderId: saveOrder._id,
    })
    
  } catch (error) {
    
    console.error("Error in wallet place order", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });

  }
};


// Razorpay
const razorpayOrderSuccess = async (req,res) => {
  try {
    
    const {
      orderItems,
      totalPrice,
      finalAmount,
      discount,
      status,
      couponApplied,
      paymentMethod,
    } = req.body;
    console.log("Receiving data from frondend:", req.body);

    const userId = req.session.user;

    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      })
    };

    const userAddresses = await Address.find({userId: userData._id});
    if (!userAddresses || userAddresses.length === 0) {
      return res.status(400).json({
        status: false, 
        message: "No addresses found for the user" 
      });
    };

    const defaultAddress = userAddresses
      .flatMap((addr) => addr.address)
      .find((addr) => addr.isDefault === true);

    if(!defaultAddress) {
      return res.status(400).json({
        status: false,
        message: "No default addressmfound",
      })
    };

    const orderId = await generateOrderId()

    const newOrder = new Order({
      orderId,
      userId: userData._id,
      orderItems,
      totalPrice,
      finalAmount,
      address: defaultAddress._id,
      status: status || "Order placed",
      createdOn: new Date(),
      couponApplied,
      discount,
      paymentMethod: paymentMethod || "Prepaid"
    });

    const savedOrder = await newOrder.save();

    // Handle inventory update and cart removal
    for (const item of orderItems) {
      const productId = item.product;
      const ordereQuantity = item.quantity;

      const product = await Product.findById(productId);
      if (product) {
        if (product.quantity < ordereQuantity) {
          return res.status(400).json({
            status: false,
            message: `Not enough stock for product ${product.productName}`,
          });
        };

        product.quantity -= ordereQuantity;
        await product.save();
      }
    };

    // Remove item from cart
    await Cart.findOneAndUpdate(
      {userId: userData._id},
      {
        $pull: {
          items: {
            productId: {$in: orderItems.map((item) => item.product)},
          }
        }
      }
    )
  
    const amountInPaise = Math.round(finalAmount * 100);

    // Create a Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${new Date().getTime()}`,
      payment_capture: 1,
    };

    // console.log("Razorpay instance:", razorpay);
    console.log("Creating order with options:", options);

    if (!razorpay) {
      console.error("Razorpay instance not initialized");
      return res.status(500).json({
        status: false,
        message: "Payment gateway not properly configured"
      });
    };

    const razorpayOrder = await razorpay.orders.create(options);
    savedOrder.razorpayOrderId = razorpayOrder.id;  // Store Razorpay order ID in the order document
    await savedOrder.save();

    const userEmail = userData.email;
    const emailSent = await sendOrderConfirmationEmail(
      userEmail,
      savedOrder,
      defaultAddress
    );

    if (!emailSent) {
      return res.status(400).json({
        status: false,
        message: "Failed to send order confirmation email"
      });
    };

    // Return Razorpay order details to frondend
    res.status(200).json({
      status: true,
      message: "Success",
      orderId: savedOrder._id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      paymentMethod: paymentMethod || "razorpay"
    })

  } catch (error) {
    
    console.error("Razorpay order creation error:", error);
    
    res.status(500).json({
      status: false,
      message: "Failed to create Razorpay order: " + (error.message || "Unknown error"),
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

  }
};


const getRazorpayOrderFaild = async (req, res) => {
  try {

    const {orderId} = req.query;
    console.log("OrderId:", orderId);

    const userId = req.session.user;
    const userData = await User.findById(userId).select('name email');

    if (!userData) {
      return res.status(400).json({
        status: false,
        message: "User not found"
      })
    };

    const cart = await Cart.findOne({userId: userData._id});
    const cartItems = cart ? cart.items : [];

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(400).json({
        status: false,
        message: "Order not found"
      })
    };

  // Update order status to Payment pending
  order.status = "Payment Pending";
  await order.save();

  res.render("order-failed", {
    order,
    userData,
    cartItems,
  });
    
  } catch (error) {
    
    console.error("Error in razorpay order failed", error);
    res.status(500).json({
      status: false,
      message: "Internal server error"
    })
    
  }
}








module.exports = {
  getCheckoutPage,
  updateDefaultAddress,
  getEditCheckoutAddress,
  getaddCheckoutAddress,
  codPlaceOrder,
  getOrderSuccess,
  walletPlaceOrder,
  razorpayOrderSuccess,
  getRazorpayOrderFaild,
}