const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Banner = require("../../models/bannerSchema");
const Cart = require("../../models/cartSchema");
const Wallet = require("../../models/walletSchema");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const bcrypt = require("bcrypt");
const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");

//Page not found NotFound
const pageNotFound = async (req, res) => {
  try {
    res.render("page-NotFound");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// Home page
const loadHomepage = async (req, res) => {
  try {
    const today = new Date().toISOString(); // Get current date
    const findBanner = await Banner.find({
      startDate: {
        $lt: new Date(today),
      },
      endDate: {
        $gt: new Date(today),
      },
    });

    const user = req.session.user;
    // console.log("session user:",  user)

    const categories = await Category.find({ isListed: true });
    let ProductData = await Product.find({
      isBlock: false,
      isSoftDelete: false,
      category: {
        $in: categories.map((category) => category._id),
      },
      quantity: {
        $gt: 0,
      },
    });

    // Sort for resently added product
    ProductData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Show only 4 new products
    ProductData = ProductData.slice(0, 4);

    if (user) {
      const userData = await User.findOne({ _id: user }).populate("wishlist");

      // For disply how may cart item at cat logo
      const cart = await Cart.findOne({ userId: userData._id });
      const cartLength = cart ? cart.items.length : [];

      return res.render("home", {
        user: userData,
        products: ProductData,
        banner: findBanner || [],
        cartLength,
      }); //When reaching home, pass user data to frontend
    } else {
      return res.render("home", {
        user: null,
        products: ProductData,
        banner: findBanner || [],
      });
    }
  } catch (error) {
    console.error("Home page not found", error);
    res.status(InternalServerError).send("Server error");
  }
};

// Load signup page
const loadSignup = async (req, res) => {
  try {

    return res.render("signup", { message: null });

  } catch (error) {

    console.log("Home page not loading", error);
    res.status(InternalServerError).send("Server error");
  }
};

// To generate OTP
function generateOtp() {
  try {
    
    return Math.floor(100000 + Math.random() * 900000).toString();

  } catch (error) {
    
    console.log("Error in generate OTP", error);
    res.status(InternalServerError).send("Server error");

  }
}

// For send a email
async function sendVerificationEmail(email, otp) {
  try {
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

    // Email content
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP : ${otp}`,
      html: `<b>Your OTP : ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Email failed to send", error);
    return false;
  }
}

// Generate a new referral code.
function generateReferral (userName) {
  try {
    
    const refCode = userName.slice(0,3).toLowerCase() + Math.floor(100 + Math.random() * 900).toString();
    return refCode;

  } catch (error) {

    console.log("Error in generate referral", error);
    res.status(InternalServerError).send("Server error");
    
  }
  
};

// Create a new user
const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword, referral } = req.body;

    // Check oassword is match
    if (password !== cPassword) {
      return res.render("signup", { message: "Password do not match" });
    }

    // Check the email is unique
    const findUser = await User.findOne({ email });
    console.log("findUser:", findUser);
    
    if (findUser) {
      return res.render("signup", {
        name,
        phone,
        email,
        password,
        cPassword, // for store the typed data in inputs,
        referral,
        message: "User with this email already exists",
      });
    }

    const reffered_user = await User.findOne({referralCode: referral});
    console.log("reffered_user:", reffered_user);

    // Check the refferal code
    if (referral) {
      if (reffered_user.referralCode === referral) {

        let refferedUserWallet = await Wallet.findOne({userId: reffered_user._id});
        console.log("refferedUserWallet:", refferedUserWallet);

        if (!refferedUserWallet) {

          // Create a new wallet for referred user
          refferedUserWallet = new Wallet({
            userId: reffered_user._id,
            balance: 200, // give ₹200 starting credit
            transactions: [{
              type: "credit",
              amount: 200,
              description: "You've earned ₹200 referral credit",
              balance: 200,
              createdAt: new Date(),
            }]
          });
          refferedUserWallet.save();

        }else {

          // Reffered user get 200 rs.
          refferedUserWallet.balance += 200;
          // Save transaction history
          refferedUserWallet.transactions.push({
            type: "credit",
            amount: 200,
            description: "You've earned ₹200 referral credit",
            balance: refferedUserWallet.balance,
            createdAt: new Date(),
          });
          await refferedUserWallet.save();
        }
      };
    };

    const otp = generateOtp();

    const emailSend = await sendVerificationEmail(email, otp);

    if (!emailSend) {
      return res.json("email-error");
    }

    // Add data to session
    req.session.userOtp = otp; // OTP store in to session for verification
    req.session.userData = { name, phone, email, password };

    res.render("verify-otp", { email: req.session.userData.email });
    console.log("OTP Send : ", otp);
  } catch (error) {
    console.error("Signup error", error);
    res.redirect("/pageNotFound");
  }
};

// Convert to Has Password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("Error at Hash Password ", error);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);

    // Check user input otp and session otp
    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);

      // Calling the function generate referral
      const referralCode = generateReferral(user.name);

      // Create a new user
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        referralCode,
      });

      await saveUserData.save(); // Save user data to DB

      req.session.user_id = saveUserData._id; //Store user id for authorization

      // Clear OTP and user data from session
      delete req.session.userOtp;
      delete req.session.userData;

      res.json({
        success: true,
        redirectUrl: "/login",
        message: "Register successful, Please login",
      });
    } else {
      res
        .status(BadRequest)
        .json({ success: false, message: "Invalid OTP, Please try again" });
    }
  } catch (error) {
    console.error("Error verifying OTP ", error);
    res
      .status(InternalServerError)
      .json({ success: false, message: "An error occured" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;

    if (!email) {
      return res
        .status(BadRequest)
        .json({ success: false, message: "User data or email missing" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSend = await sendVerificationEmail(email, otp);

    if (emailSend) {
      console.log("Resend OTP :", otp);

      res
        .status(OK)
        .json({ success: true, message: "OTP Resend Successfully" });
    } else {
      return res.status(InternalServerError).json({
        success: false,
        message: "Failed to resend otp Please try again",
      });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    return res
      .status(InternalServerError)
      .json({ success: false, message: "Internal Server Error." });
  }
};

// Login page load
const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      res.render("login", { message: null });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render("login", { message: "User not found." });
    }

    if (findUser.isBlock) {
      return res.render("login", { message: "User is blocked by admin." });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("login", { message: "Incorrecte credentials" });
    }

    req.session.user = findUser;
    // console.log("session: ", req.session.user);
    // console.log("findUser: ", findUser);
    res.redirect("/");
  } catch (error) {
    console.error("Login error", error);
    res.render("login", { message: "Login failed. Please try later." });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error", err);
        return res.redirect("/pageNotFound");
      }

      return res.redirect("/login");
    });
  } catch (error) {
    console.error("Logout error", error);
    res.redirect("/pageNotFound");
  }
};

// Shop page
const loadShopPage = async (req, res) => {
  try {
    let userData = null;
    let cartData = [];

    if (req.session.user) {
      userData = await User.findOne({ _id: req.session.user }).populate(
        "wishlist"
      );

      if (userData && userData.cart && userData.cart.length > 0) {
        const cart = await Cart.findOne({
          _id: { $in: userData.cart },
        }).populate("items.productId");

        if (cart && cart.items.length > 0) {
          cartData = cart.items.map((item) => ({
            quantity: item.quantity,
            productDetails: [
              {
                _id: item.productId._id,
                id: item.productId._id,
                productName: item.productId.productName,
                category: item.productId.category,
                brand: item.productId.brand,
                salePrice: item.productId.salePrice,
                productImage: item.productId.productImage,
                quantity: item.productId.quantity, // product's available quantity
              },
            ],
          }));
        }
      }
    }
    // Fetch categories
    const categories = await Category.find({
      isListed: true,
      isSoftDelete: false,
    });
    const categoryIds = categories.map((category) => category._id.toString());

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    // Fetch products
    const products = await Product.find({
      isBlock: false,
      isSoftDelete: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments({
      isBlock: false,
      isSoftDelete: false,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    });

    const totalPages = Math.ceil(totalProducts / limit);

    const categoriesWithIds = categories.map((category) => ({
      _id: category._id,
      name: category.name,
    }));

    res.render("shop", {
      user: userData,
      products: products,
      category: categoriesWithIds,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
      filter: null,
      cartData,
      cartLength: cartData.length,
    });
  } catch (error) {
    console.error("Shop page not found: ", error);
    res.status(InternalServerError).redirect("/pageNotFound");
  }
};

// Filter setups
const filterProducts = async (req, res) => {
  try {
    const user = req.session.user;
    const categoryId = req.query.categoryId;
    // const filter = req.query.filter;

    // find category using ternary operator
    const findCategory = categoryId
      ? await Category.findById(categoryId)
      : null;

    // Create query object
    const query = {
      isBlock: false,
      isSoftDelete: false,
      quantity: { $gt: 0 },
    };

    if (findCategory && findCategory._id) {
      query.category = findCategory._id;
    } else {
      console.log("Error in findCategory");
    }

    let findProducts = await Product.find(query).sort({ createdAt: -1 }).lean();
    // findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // console.log(findProducts)

    // Fetch listed categories
    const categories = await Category.find({ isListed: true });

    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentProduct = findProducts.slice(startIndex, endIndex);

    // Save user search activity to DB
    let userData = null;
    if (user) {
      userData = await User.findOne({ _id: user });
      if (userData) {
        const searchEntry = {
          category: findCategory ? findCategory._id : null,
          searchedOn: new Date(),
        };
        userData.searchHistory.push(searchEntry);
        await userData.save();
      }
    }
    // console.log("currentProduct :", currentProduct)
    // console.log("findProducts :", findProducts)

    req.session.filteredProducts = currentProduct; // Store filtered products in session for Search feature

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages: totalPages,
      currentPage: currentPage,
      selectedCategory: categoryId || null,
      count: currentProduct.length,
      filter: currentProduct,
    });
  } catch (error) {
    console.error("Error in Filter Products: ", error);
    res.redirect("/pageNotFound");
  }
};

// Filtered by price range
const filterByPrice = async (req, res) => {
  try {
    const user = req.session.user;
    const lowestPrice = req.query.gt;
    const highestPrice = req.query.lt;

    const userData = await User.findOne({ _id: user });
    const categories = await Category.find({ isListed: true }).lean();

    // Find products for that price range.
    let findProducts = await Product.find({
      salePrice: { $gt: lowestPrice, $lt: highestPrice },
      isBlock: false,
      isSoftDelete: false,
      quantity: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .lean();
    // findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage);

    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    const currentProduct = findProducts.slice(startIndex, endIndex);

    req.session.filteredProducts = findProducts; // Store filtered products in session for Search feature

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages: totalPages,
      currentPage: currentPage,
      count: currentProduct.length,
      filter: null,
    });
  } catch (error) {
    console.error("Error in filter by price", error);
    res.redirect("/pageNotFound");
  }
};

// Search products at shope page
const searchProducts = async (req, res) => {
  try {
    const user = req.session.user;
    const search = req.body.search.trim();
    // console.log(search)
    if (!search) {
      return res.redirect("/shop");
    }

    const userData = await User.findById(user);

    const categories = await Category.find({
      isListed: true,
      isSoftDelete: false,
    }).lean();
    const categoryIds = categories.map((category) => category._id);

    // console.log("Session products :", req.session.filteredProducts);

    let searchResults = [];
    if (
      req.session.filteredProducts &&
      req.session.filteredProducts.length > 0
    ) {
      searchResults = req.session.filteredProducts.filter((product) => {
        return product.productName.toLowerCase().includes(search.toLowerCase());
      });
    } else {
      searchResults = await Product.find({
        productName: { $regex: search, $options: "i" },
        isBlock: false,
        isSoftDelete: false,
        quantity: { $gt: 0 },
        category: { $in: categoryIds },
      }).lean();
    }
    console.log("search result: ", searchResults.length);
    searchResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // pagination
    let itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    let totalPages = Math.ceil(searchResults.length / itemsPerPage);

    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    const currentProduct = searchResults.slice(startIndex, endIndex);
    // console.log("current products :", currentProduct)

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages: totalPages,
      currentPage: currentPage,
      count: searchResults.length,
      searchValue: search,
      filter: null,
    });
  } catch (error) {
    console.error("Error in get search products", error);
    res.redirect("/pageNotFound");
  }
};

// Sorted by price Low to High
const filterPriceLowToHigh = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    const categories = await Category.find({
      isListed: true,
      isSoftDelete: false,
    }).lean();

    // Pagination
    let itemsPerPage = 9;
    let currentPage = parseInt(req.query.page) || 1;
    const totalProducts = await Product.countDocuments({
      isBlock: false,
      isSoftDelete: false,
    });
    let totalPages = Math.ceil(totalProducts / itemsPerPage);

    const products = await Product.find({ isBlock: false, isSoftDelete: false })
      .sort({ salePrice: 1 })
      .skip((currentPage - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .lean();

    res.render("shop", {
      userData: userData,
      products: products,
      category: categories,
      totalPages: totalPages,
      currentPage: currentPage,
      count: totalProducts,
      filter: null,
      user: userData,
    });
  } catch (error) {
    console.error("Error in Filter price low to high", error);
    res.status(InternalServerError).redirect("/pageNotFound");
  }
};

// Sorted by price High to Low
const filterPriceHighToLow = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    const categories = await Category.find({
      isListed: true,
      isSoftDelete: false,
    }).lean();

    // Pagination
    let itemsPerPage = 9;
    let currentPage = parseInt(req.query.page) || 1;
    const totalProducts = await Product.countDocuments({
      isBlock: false,
      isSoftDelete: false,
    });
    let totalPages = Math.ceil(totalProducts / itemsPerPage);

    const products = await Product.find({ isBlock: false, isSoftDelete: false })
      .sort({ salePrice: -1 })
      .skip((currentPage - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .lean();

    res.render("shop", {
      userData: userData,
      products: products,
      category: categories,
      totalPages: totalPages,
      currentPage: currentPage,
      count: totalProducts,
      filter: null,
      user: userData,
    });
  } catch (error) {
    console.error("Error in Filter price High to Low", error);
    res.status(InternalServerError).redirect("/pageNotFound");
  }
};

// Ascending Oeder by Name
const filterNameAscendingOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    const categories = await Category.find({
      isListed: true,
      isSoftDelete: false,
    }).lean();

    // Pagination
    let itemsPerPage = 9;
    let currentPage = parseInt(req.query.page) || 1;
    const totalProducts = await Product.countDocuments({
      isBlock: false,
      isSoftDelete: false,
    });
    let totalPages = Math.ceil(totalProducts / itemsPerPage);

    // find products based condition
    const findProducts = await Product.find({
      isBlock: false,
      isSoftDelete: false,
    })
      .sort({ productName: 1 })
      .skip((currentPage - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .lean();

    res.render("shop", {
      userData: userData,
      user,
      products: findProducts,
      category: categories,
      totalPages: totalPages,
      currentPage: currentPage,
      count: findProducts.length,
      filter: null,
    });
  } catch (error) {
    console.error("Error in Filter name ascending order", error);
    res.status(InternalServerError).redirect("/pageNotFound");
  }
};

// Ascending Oeder by Name
const filterNameDescendingOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    const categories = await Category.find({
      isListed: true,
      isSoftDelete: false,
    }).lean();

    // Pagination
    let itemsPerPage =9;
    let currentPage = parseInt(req.query.page) || 1;
    const totalProducts = await Product.countDocuments({
      isBlock: false,
      isSoftDelete: false,
    });
    let totalPages = Math.ceil(totalProducts / itemsPerPage);

    // find products based condition
    const findProducts = await Product.find({
      isBlock: false,
      isSoftDelete: false,
    })
      .sort({ productName: -1 })
      .skip((currentPage - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .lean();

    res.render("shop", {
      userData: userData,
      user,
      products: findProducts,
      category: categories,
      totalPages: totalPages,
      currentPage: currentPage,
      count: findProducts.length,
      filter: null,
    });
  } catch (error) {
    console.error("Error in Filter name descending order", error);
    res.status(InternalServerError).redirect("/pageNotFound");
  }
};

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  loadShopPage,
  filterProducts,
  filterByPrice,
  searchProducts,
  filterPriceLowToHigh,
  filterPriceHighToLow,
  filterNameAscendingOrder,
  filterNameDescendingOrder,
};
