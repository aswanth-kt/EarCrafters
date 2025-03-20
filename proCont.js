/* eslint-disable no-undef */
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const Review = require("../../models/reviewSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Wishlist = require("../../models/wishlistSchema");
const Wallet = require("../../models/walletSchema");
const Transaction = require("../../models/transactionSchema");
const { OK, BadRequest, Unauthorized, NotFound, InternalServerError } = require("../../helpers/httpStatusCodes");
const { INTERNAL_SERVER_ERROR } = require("../../helpers/constants").ERROR_MESSAGES;
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID_KEY,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});
const { generateInvoicePDF } = require("../../helpers/generateInvoicePDF");

const sendOrderConfirmationEmail = async (email, order, defaultAddress) => {
  try {
    const productIds = order.ordereditems.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    const productMap = {};
    products.forEach((product) => {
      productMap[product._id] = product.productName;
    });

    const orderedItems = order.ordereditems
      .map(
        (item) =>
          `<tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${productMap[item.product]}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
           </tr>`
      )
      .join("");

    const totalAmount = order.finalAmount;
    const paymentMethod = "Cash on Delivery (COD)";

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
          <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for shopping with Art Mart</p>
        </div>

        <!-- Order ID and Welcome Message -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2c3e50; font-size: 20px; margin-bottom: 15px;">Order ID: ${order._id}</h2>
          <p style="font-size: 16px; line-height: 1.6;">Dear Customer,</p>
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
              ${orderedItems}
            </tbody>
            <tfoot>
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
          <p style="margin: 0; color: #666; font-size: 14px;">Thank you for choosing Art Mart!</p>
          <div style="margin-top: 20px;">
            <p style="margin: 5px 0; color: #666; font-size: 14px;">Best regards,</p>
            <p style="margin: 5px 0; color:rgb(73, 171, 210); font-weight: bold; font-size: 16px;">Art Mart Team</p>
          </div>
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
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
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Order Confirmation - Thank You for Your Purchase!",
      html: emailContent,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    throw new Error("Failed to send confirmation email");
  }
};


const loadProductDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const productId = req.query.id;
    const product = await Product.findById(productId).populate(
      "category brand"
    );

    const category = product.category;
    const brand = product.brand;
    const couponData = await Coupon.find({ isList: true });

    const priceLowerBound = product.salePrice - product.salePrice * 0.2;
    const priceUpperBound = product.salePrice + product.salePrice * 0.2;

    // Get related products based on the same category and within the price range (excluding the current product)
    const relatedProducts = await Product.find({
      category: product.category._id,
      salePrice: { $gte: priceLowerBound, $lte: priceUpperBound },
      _id: { $ne: product._id },
      isBlocked: false,
      isDeleted: false,
    }).limit(4);

    const relatedProductIds = relatedProducts.map((product) => product._id);

    // Get some random products (excluding the current product and the related products)
    const randomProducts = await Product.aggregate([
      {
        $match: {
          _id: {
            $nin: [...relatedProductIds, product._id],
          },
          isBlocked: false,
          isDeleted: false,
        },
      },
      {
        $sample: { size: 4 },
      },
    ]);

    const reviews = await Review.find({ product_id: productId })
      .populate("user_id", "name")
      .sort({ review_date: -1 });

    // Calculate average rating
    const averageRating = await Review.aggregate([
      { $match: { product_id: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRating = averageRating.length > 0 ? averageRating[0].avgRating : 0;

    const cart = await Cart.findOne({ userId: userId });

    const cartItems = cart ? cart.items : [];

    res.render("product-details", {
      user: userData,
      products: product,
      category: category,
      brand: brand,
      quantity: product.quantity,
      coupons: couponData,
      relatedProducts: relatedProducts,
      randomProducts: randomProducts,
      reviews: reviews,
      avgRating: avgRating,
      cartItems: cartItems,
      activePage: "shop",
    });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      model: Product,
    });

    if (!cart) {
      return res.render("cart", {
        cartItems: [],
        subtotal: 0,
        user: userData,
        activePage: "shop",
      });
    }

    const cartItems = cart.items.map((item) => ({
      productName: item.productId.productName,
      productImage: item.productId.productImage,
      cartQuantity: item.quantity,
      productStock: item.productId.quantity,
      salePrice: item.productId.salePrice,
      productOffer: item.productId.productOffer,
      productId: item.productId._id,
    }));

    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.salePrice * item.cartQuantity;
    });

    res.render("cart", {
      user: userData,
      cartItems,
      subtotal,
      activePage: "shop",
      productStock: cartItems.map((item) => item.productStock),
    });
  } catch (error) {
    console.error(error);
    res.status(InternalServerError).send("Error loading cart");
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.status(Unauthorized).json({
        success: false,
        message: "Please log in to add items to the cart.",
      });
    }

    const productId = req.body.productId;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(NotFound).send("Product not found");
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [
          {
            productId: product._id,
            quantity: 1,
            price: product.salePrice,
            totalPrice: product.salePrice * 1,
            status: 1,
            cancellationReason: 0,
          },
        ],
      });
    } else {
      const productIndex = cart.items.findIndex(
        (item) => item.productId.toString() === product._id.toString()
      );

      if (productIndex === -1) {
        cart.items.push({
          productId: product._id,
          quantity: 1,
          price: product.salePrice,
          totalPrice: product.salePrice * 1,
          status: 1,
          cancellationReason: 0,
        });
      } else {
        cart.items[productIndex].quantity += 1;
        cart.items[productIndex].totalPrice =
          cart.items[productIndex].price * cart.items[productIndex].quantity;
      }
    }

    await cart.save();

    res.json({ success: true, message: "Item added to cart" });
  } catch (error) {
    console.error(error);
    return res.status(InternalServerError).send("Error adding item to cart");
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user;
    const product = await Product.findOne({ _id: productId });

    if (quantity > 5) {
      return res.status(BadRequest).json({
        success: false,
        message: "Cannot add more than 5 of this product.",
      });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        items: [
          {
            productId,
            quantity,
            price: product.salePrice,
            totalPrice: product.salePrice * quantity,
            status: 1,
            cancellationReason: null,
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = quantity;
        cart.items[itemIndex].totalPrice =
          cart.items[itemIndex].price * quantity;
      } else {
        const productPrice = product.salePrice;
        cart.items.push({
          productId,
          quantity,
          price: productPrice,
          totalPrice: productPrice * quantity,
          status: 1,
          cancellationReason: null,
        });
      }
      await cart.save();
    }

    // Calculate total cart amount
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    res.json({
      success: true,
      cartData: {
        items: cart.items,
        totalAmount: totalAmount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(InternalServerError).json({ success: false, message: "Failed to update cart" });
  }
};

const deleteItem = async function (userId, productId) {
  try {
    const cart = await Cart.findOne({ userId: userId });

    if (!cart) {
      throw new Error("Cart not found");
    }

    const updatedCart = await Cart.updateOne(
      { userId: userId },
      {
        $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } },
      }
    );

    return updatedCart.modifiedCount > 0;
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    return false;
  }
};

const deletFromCart = async (req, res) => {
  const productId = req.params.productId;
  const userId = req.session.user;

  try {
    const result = await deleteItem(userId, productId);

    if (result) {
      return res.json({ success: true });
    } else {
      return res
        .status(BadRequest)
        .json({ success: false, message: "Item not found in cart." });
    }
  } catch (error) {
    console.error("Error deleting item:", error);
    return res
      .status(InternalServerError)
      .json({ success: false, message: INTERNAL_SERVER_ERROR });
  }
};

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId).select('name email')

    const cart = await Cart.findOne({ userId: userId }).populate(
      "items.productId"
    );

    const userAddress = await Address.findOne({ userId: userId }).select(
      "address"
    );

    const defaultAddress = userAddress
      ? userAddress.address.find((addr) => addr.isDefault)
      : null;

    const cartItems = cart ? cart.items : [];

    const coupons = await Coupon.find();
    const currentDate = new Date();
    const validCoupons = coupons.filter((coupon) => {
      const expireDtae = new Date(coupon.expireOn);
      return expireDtae >= currentDate
    })

    res.render("checkout", {
      activePage: "shop",
      user: user,
      cartItems: cartItems,
      addresses: userAddress ? userAddress.address : [],
      defaultAddress: defaultAddress || {},
      coupon: validCoupons,
    });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const updateDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res
        .status(Unauthorized)
        .json({ success: false, message: "User is not authenticated" });
    }

    await Address.updateMany(
      { userId: userId },
      { $set: { "address.$[].isDefault": false } }
    );

    const updatedAddress = await Address.updateOne(
      { userId: userId, "address._id": addressId },
      { $set: { "address.$.isDefault": true } }
    );

    if (updatedAddress.nModified === 0) {
      return res.status(BadRequest).json({
        success: false,
        message: "Address not found or already set as default",
      });
    }

    res
      .status(OK)
      .json({ success: true, message: "Default address updated successfully" });
  } catch (error) {
    console.error("Error updating default address:", error);
    res.status(InternalServerError).json({ success: false, message: INTERNAL_SERVER_ERROR });
  }
};

const codPlaceOrder = async (req, res) => {
  try {
    const {
      ordereditems,
      totalprice,
      finalAmount,
      discount,
      status,
      couponApplied,
    } = req.body;
    const userId = req.session.user;

    const userAddresses = await Address.find({ userId: userId });
    if (!userAddresses || userAddresses.length === 0) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "No addresses found for the user" });
    }

    const defaultAddress = userAddresses
      .flatMap((addr) => addr.address)
      .find((addr) => addr.isDefault === true);

    if (!defaultAddress) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "No default address found" });
    }

    // After successful order placement, mark the coupon as used if one was applied
    if (couponApplied && req.session.pendingCoupon) {
      await Coupon.findByIdAndUpdate(
        req.session.pendingCoupon.couponId,
        { userId: userId }
      );
      // Clear the pending coupon from session
      delete req.session.pendingCoupon;
    }

    const newOrder = new Order({
      userId: userId,
      ordereditems,
      totalprice,
      finalAmount,
      address: defaultAddress._id,
      status: status || "Order Placed",
      createdOn: new Date(),
      invoiceDate: new Date(),
      couponApplied, // Store if the coupon was applied
      discount, // Store the discount value
      paymentMethod: "COD",
    });

    const savedOrder = await newOrder.save();

    for (const item of ordereditems) {
      const productId = item.product;
      const orderedQuantity = item.quantity;

      const product = await Product.findById(productId);
      if (product) {
        if (product.quantity < orderedQuantity) {
          return res.status(BadRequest).json({
            success: false,
            message: `Not enough stock for product ${product.productName}`,
          });
        }
        product.quantity -= orderedQuantity;
        await product.save();
      }
    }

    // Remove items from cart after order is placed
    await Cart.findOneAndUpdate(
      { userId: userId },
      {
        $pull: {
          items: {
            productId: { $in: ordereditems.map((item) => item.product) },
          },
        },
      }
    );

    const userData = await User.findOne({ _id: userId });
    const userEmail = userData.email;
    const emailSent = await sendOrderConfirmationEmail(
      userEmail,
      savedOrder,
      defaultAddress
    );

    if (!emailSent) {
      return res.status(InternalServerError).json({
        success: false,
        message: "Failed to send order confirmation email.",
      });
    }

    return res.status(OK).json({
      success: true,
      message: "Order placed successfully!",
      orderId: savedOrder.orderId,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(InternalServerError).json({
      message: "An error occurred while placing the order. Please try again.",
    });
  }
};

const codOrderSuccess = async (req, res) => {
  try {
    const { orderId } = req.query;

    const userId = req.session.user;
    const user = await User.findById(userId).select('name email')
    const cart = await Cart.findOne({ userId: userId });

    const cartItems = cart ? cart.items : [];

    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(NotFound).json({ message: "Order not found" });
    }

    res.render("order-success", {
      order,
      message: "Your order has been successfully placed!",
      activePage: "shop",
      user: user,
      cartItems: cartItems,
    });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    return res
      .status(InternalServerError)
      .json({ message: "An error occurred while fetching the order details." });
  }
};

const razorpayOrderFailed = async (req, res) => {
  try {
    const { orderId } = req.query;

    const userId = req.session.user;
    const user = await User.findById(userId).select('name email')
    const cart = await Cart.findOne({ userId: userId });

    const cartItems = cart ? cart.items : [];

    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(NotFound).json({ message: "Order not found" });
    }

    // Update order status to "Payment Pending"
    order.status = "Payment Pending";
    await order.save();

    res.render("order-failed", {
      order: order,
      activePage: "shop",
      user: user,
      cartItems: cartItems,
    });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    return res
      .status(InternalServerError)
      .json({ message: "An error occurred while fetching the order details." });
  }
};

const loadRetryPayment = async (req, res) => {
  const { orderId } = req.query;

  try {
    const order = await Order.findOne({ orderId: orderId }).populate('ordereditems.product');
    if (!order) {
      return res.status(NotFound).send("Order not found");
    }
    const userId = req.session.user;
    const user = await User.findById(userId).select('name email')

    const userAddresses = await Address.findOne({ userId: userId });

    const address = userAddresses
      ? userAddresses.address.find((addr) => addr.isDefault)
      : null;

    const cart = await Cart.findOne({ userId: userId });

    const cartItems = cart ? cart.items : [];

    res.render("retry-checkout", {
      order: order,
      activePage: "profile",
      user: user,
      cartItems,
      address: address,
    });
  } catch (error) {
    console.error("Error loading retry payment page:", error);
    res.redirect("/pageNotFound");
  }
};

const retryPayment = async (req, res) => {
  const { orderId, paymentMethod } = req.body;

  try {
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
      return res
        .status(NotFound)
        .json({ success: false, message: "Order not found" });
    }

    const orderData = {
      ordereditems: order.ordereditems,
      totalprice: order.totalprice,
      finalAmount: order.finalAmount,
      address: order.address,
      discount: order.discount,
      couponApplied: order.couponApplied,
      userId: order.userId, 
    };

    if (paymentMethod === "razorpay") {
      const options = {
        amount: orderData.finalAmount * 100, // Convert to paise
        currency: "INR",
        receipt: `receipt_${orderId}`,
        payment_capture: 1,
      };

      const razorpayOrder = await razorpay.orders.create(options);
      order.orderId = razorpayOrder.id; 
      order.status = "Order Placed";
      await order.save();

      return res.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: orderData.finalAmount,
        currency: "INR",
        razorpayKey: process.env.RAZORPAY_ID_KEY,
        paymentMethod: "razorpay",
      });
    } else if (paymentMethod === "cod") {
      order.status = "Order Placed"; 
      order.paymentMethod = "COD";
      await order.save();

      return res.json({
        success: true,
        paymentMethod: "cod",
        orderId: order.orderId,
        redirectUrl: `/checkout/orderSuccess?orderId=${orderId}`,
      });
    } else if (paymentMethod === "wallet") {
      // Check wallet balance
      const wallet = await Wallet.findOne({ userId: orderData.userId });
      if (!wallet || wallet.balance < orderData.finalAmount) {
        return res.json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }

      wallet.balance -= orderData.finalAmount;
      await wallet.save();

      const transaction = new Transaction({
        userId: orderData.userId,
        type: "Purchased using wallet - Debit",
        amount: orderData.finalAmount,
        balance: wallet.balance,
      });
      await transaction.save();

      order.status = "Order Placed"; 
      order.paymentMethod = "wallet";
      await order.save();

      return res.json({
        success: true,
        paymentMethod: "wallet",
        orderId: order.orderId,
        redirectUrl: `/checkout/orderSuccess?orderId=${orderId}`,
      });
    }

    return res
      .status(BadRequest)
      .json({ success: false, message: "Invalid payment method" });
  } catch (error) {
    console.error("Error processing retry payment:", error);
    res.redirect("/checkout/orderFailed?orderId=" + orderId);
  }
};

const walletBalanceCheck = async (req, res) => {
  const { amount } = req.body;
  const userId = req.session.user;

  try {
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet || wallet.balance < amount) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "Insufficient balance" });
    }
    return res.status(OK).json({ success: true });
  } catch (error) {
    console.error("Error checking wallet balance:", error);
    return res.status(InternalServerError).json({
      success: false,
      message: "An error occurred while checking the wallet balance.",
    });
  }
};

const walletPlaceOrder = async (req, res) => {
  try {
    const {
      ordereditems,
      totalprice,
      finalAmount,
      discount,
      status,
      couponApplied,
    } = req.body;
    const userId = req.session.user;

    // Check if the user has a default address
    const userAddresses = await Address.find({ userId: userId });
    if (!userAddresses || userAddresses.length === 0) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "No addresses found for the user" });
    }

    const defaultAddress = userAddresses
      .flatMap((addr) => addr.address)
      .find((addr) => addr.isDefault === true);

    if (!defaultAddress) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "No default address found" });
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet || wallet.balance < finalAmount) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "Insufficient wallet balance" });
    }

    // Deduct the amount from the wallet
    wallet.balance -= finalAmount;
    await wallet.save();

    // Create a transaction record
    const transaction = new Transaction({
      userId: userId,
      type: "Purchased using wallet - Debit",
      amount: finalAmount,
      balance: wallet.balance,
    });
    await transaction.save();

    // Create the order
    const newOrder = new Order({
      userId: userId,
      ordereditems,
      totalprice,
      finalAmount,
      address: defaultAddress._id,
      status: status || "Order Placed",
      createdOn: new Date(),
      invoiceDate: new Date(),
      couponApplied,
      discount,
      paymentMethod: "wallet", // Set payment method to Wallet
    });

    const savedOrder = await newOrder.save();

    // Update product quantities
    for (const item of ordereditems) {
      const productId = item.product;
      const orderedQuantity = item.quantity;

      const product = await Product.findById(productId);
      if (product) {
        if (product.quantity < orderedQuantity) {
          return res.status(BadRequest).json({
            success: false,
            message: `Not enough stock for product ${product.productName}`,
          });
        }
        product.quantity -= orderedQuantity;
        await product.save();
      }
    }

    // Remove items from cart after order is placed
    await Cart.findOneAndUpdate(
      { userId: userId },
      {
        $pull: {
          items: {
            productId: { $in: ordereditems.map((item) => item.product) },
          },
        },
      }
    );

    const userData = await User.findOne({ _id: userId });
    const userEmail = userData.email;
    const emailSent = await sendOrderConfirmationEmail(
      userEmail,
      savedOrder,
      defaultAddress
    );

    if (!emailSent) {
      return res.status(InternalServerError).json({
        success: false,
        message: "Failed to send order confirmation email.",
      });
    }

    return res.status(OK).json({
      success: true,
      message: "Order placed successfully!",
      orderId: savedOrder.orderId,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(InternalServerError).json({
      message: "An error occurred while placing the order. Please try again.",
    });
  }
};

const razorpayPlaceOrder = async (req, res) => {
  try {
    const {
      ordereditems,
      totalprice,
      finalAmount,
      discount,
      status,
      couponApplied,
    } = req.body;
    const userId = req.session.user;

    const userAddresses = await Address.find({ userId: userId });
    if (!userAddresses || userAddresses.length === 0) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "No addresses found for the user" });
    }

    const defaultAddress = userAddresses
      .flatMap((addr) => addr.address)
      .find((addr) => addr.isDefault === true);

    if (!defaultAddress) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "No default address found" });
    }

    const newOrder = new Order({
      userId: userId,
      ordereditems,
      totalprice,
      finalAmount,
      address: defaultAddress._id,
      status: status || "Order Placed",
      createdOn: new Date(),
      invoiceDate: new Date(),
      couponApplied,
      discount,
      paymentMethod: "prepaid",
    });

    const savedOrder = await newOrder.save();

    // Handle inventory update and cart removal
    for (const item of ordereditems) {
      const productId = item.product;
      const orderedQuantity = item.quantity;

      const product = await Product.findById(productId);
      if (product) {
        if (product.quantity < orderedQuantity) {
          return res.status(BadRequest).json({
            success: false,
            message: `Not enough stock for product ${product.productName}`,
          });
        }
        product.quantity -= orderedQuantity;
        await product.save();
      }
    }

    // Remove items from cart
    await Cart.findOneAndUpdate(
      { userId: userId },
      {
        $pull: {
          items: {
            productId: { $in: ordereditems.map((item) => item.product) },
          },
        },
      }
    );

    const amountInPaise = Math.round(finalAmount * 100);

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${new Date().getTime()}`,
      payment_capture: 1,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    savedOrder.orderId = razorpayOrder.id; // Store Razorpay order ID in the order document
    await savedOrder.save();

    const userData = await User.findOne({ _id: userId });
    const userEmail = userData.email;
    const emailSent = await sendOrderConfirmationEmail(
      userEmail,
      savedOrder,
      defaultAddress
    );

    if (!emailSent) {
      return res.status(InternalServerError).json({
        success: false,
        message: "Failed to send order confirmation email.",
      });
    }


    // Return Razorpay order details to frontend
    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: finalAmount,
      currency: "INR",
      razorpayKey: process.env.RAZORPAY_ID_KEY,
      paymentMethod: "razorpay",
    });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res
      .status(InternalServerError)
      .json({ success: false, message: "Failed to create Razorpay order" });
  }
};

const loadReview = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.query.product_id;
    const user = req.session.user;

    const orders = await Order.findById(orderId)
      .populate("ordereditems.product")
      .exec();
    const product = orders.ordereditems.find(
      (item) => item.product._id.toString() === productId
    ).product;

    const cart = await Cart.findOne({ userId: user });

    const cartItems = cart ? cart.items : [];

    // Checking if the user has already submitted a review for this product in this order
    const existingReview = await Review.findOne({
      product_id: productId,
      user_id: user._id,
    });

    res.render("review", {
      orders,
      product,
      activePage: "profile",
      user: user,
      cartItems: cartItems,
      existingReview,
    });
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(InternalServerError).json({ success: false, message: "Failed to load review" });
  }
};

const postReview = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.body.product_id;

    const { rating, review_text } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(BadRequest).send("Rating must be between 1 and 5");
    }

    const order = await Order.findById(orderId).populate(
      "ordereditems.product"
    );

    if (!order) {
      return res.status(NotFound).send("Order not found");
    }

    const orderedItem = order.ordereditems.find(
      (item) => item.product._id.toString() === productId
    );

    if (!orderedItem) {
      return res.status(BadRequest).send("Product not found in this order");
    }

    const newReview = new Review({
      product_id: productId,
      user_id: order.userId,
      rating: rating,
      review_date: Date.now(),
      review_text: review_text,
      verified_purchase: true,
    });

    await newReview.save();

    const product = await Product.findById(productId);
    product.reviews.push(newReview._id);
    await product.save();

    res.status(OK).json({
      success: true,
      message: "Thank you for your review!",
      review: newReview,
    });
  } catch (error) {
    console.error(error);
    res.status(InternalServerError).send("Something went wrong while submitting your review");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;

    // Check if the user is logged in
    if (!userId) {
      return res.status(Unauthorized).json({
        success: false,
        message: "Please log in to add items to the wishlist.",
      });
    }

    const productId = req.body.productId;

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(NotFound).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Find or create the user's wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // If no wishlist exists, create a new one
      wishlist = new Wishlist({
        userId,
        products: [
          {
            productId: product._id,
            addedOn: Date.now(),
          },
        ],
      });
    } else {
      // Check if the product already exists in the wishlist
      const productExists = wishlist.products.some(
        (item) => item.productId.toString() === productId
      );
      if (productExists) {
        return res.status(BadRequest).json({
          success: false,
          message: "This product is already in your wishlist.",
        });
      }

      // Add the new product to the wishlist
      wishlist.products.push({
        productId: product._id,
        addedOn: Date.now(),
      });
    }

    // Save the wishlist to the database
    await wishlist.save();

    // Send a success response
    res.json({ success: true, message: "Item added to wishlist" });
  } catch (error) {
    console.error("Error adding item to wishlist:", error);
    res.status(InternalServerError).json({
      success: false,
      message: "An error occurred while adding the item to the wishlist.",
    });
  }
};

const deleteFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.body.productId;

    if (!userId) {
      return res.status(Unauthorized).json({
        success: false,
        message: "Please log in to remove items from the wishlist.",
      });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(NotFound).json({
        success: false,
        message: "Wishlist not found.",
      });
    }

    const productIndex = wishlist.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(NotFound).json({
        success: false,
        message: "Product not found in your wishlist.",
      });
    }

    wishlist.products.splice(productIndex, 1);

    await wishlist.save();

    return res.json({
      success: true,
      message: "Product removed from wishlist.",
    });
  } catch (error) {
    console.error(error);
    return res.status(InternalServerError).json({
      success: false,
      message: "Error removing item from wishlist.",
    });
  }
};

const coupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      isDeleted: false,
      expireOn: { $gte: new Date() },
    });
    res.json(coupons);
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    res.status(InternalServerError).json({ message: "Error fetching coupons" });
  }
};

const applyCoupon = async (req, res) => {
  const { code, totalPrice } = req.body; 
  const userId = req.session.user;

  try {
    const coupon = await Coupon.findOne({ name: code, isDeleted: false });

    if (!coupon) {
      return res.status(400).json({ message: "Coupon not found" });
    }

    if (coupon.expireOn < new Date()) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (totalPrice < coupon.minPurchaseAmount) {
      return res.status(400).json({
        message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} not met`,
      });
    }

    if (coupon.usedBy.includes(userId)) {
      return res.status(400).json({ message: "You have already used this coupon" });
    }

    if (coupon.offerPrice >= totalPrice) {
      return res.status(400).json({
        message: `This coupon offers ₹${coupon.offerPrice} discount. Please add more items worth at least ₹${coupon.offerPrice - totalPrice + 1} to your cart to use this coupon.`
      });
    }

    const newTotalPrice = totalPrice - coupon.offerPrice;

    req.session.pendingCoupon = {
      couponId: coupon._id,
      code: coupon.name,
      offerPrice: coupon.offerPrice
    };

    await Coupon.updateOne(
      { _id: coupon._id },
      { $push: { usedBy: userId } } 
    );

    res.json({ 
      success: true, 
      offerPrice: coupon.offerPrice, 
      newTotalPrice: newTotalPrice
    });
  } catch (error) {
    res.status(500).json({ message: "Error applying coupon", error });
  }
};

const removeCoupon = async (req, res) => {
  const { code, totalPrice } = req.body;

  try {
    const coupon = await Coupon.findOne({ name: code, isDeleted: false });

    if (!coupon) {
      return res.status(BadRequest).json({ message: "Coupon not found" });
    }

    // Clear the pending coupon from session
    if (req.session.pendingCoupon) {
      delete req.session.pendingCoupon;
    }

    const newTotalPrice = totalPrice + coupon.offerPrice;
    res.json({ success: true, newTotalPrice });
  } catch (error) {
    res.status(InternalServerError).json({ message: "Error removing coupon", error });
  }
};


const generateInvoice = async (req, res) => {
  const { orderId } = req.params;

  try {
    const pdfBuffer = await generateInvoicePDF(orderId); // Call the helper function to generate the PDF

    // Send the PDF as a response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${orderId}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(InternalServerError).json({ message: "Error generating invoice" });
  }
};

module.exports = {
  loadProductDetails,
  loadCart,
  addToCart,
  updateCartQuantity,
  deletFromCart,
  loadCheckout,
  updateDefaultAddress,
  codPlaceOrder,
  razorpayPlaceOrder,
  walletBalanceCheck,
  walletPlaceOrder,
  codOrderSuccess,
  razorpayOrderFailed,
  loadRetryPayment,
  retryPayment,
  loadReview,
  postReview,
  addToWishlist,
  deleteFromWishlist,
  coupons,
  applyCoupon,
  removeCoupon,
  generateInvoice,
};