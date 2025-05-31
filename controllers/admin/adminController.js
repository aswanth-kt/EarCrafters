const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");
// const { default: orders } = require("razorpay/dist/types/orders");

// Admin page error
const pageError = async (req, res) => {
  res.render("admin-error");
};

// Login page
const loadLogin = async (req, res) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/dashboard");
    }

    return res.render("admin-login", { message: null });

  } catch (error) {
    console.error("Dashboard page not found", error);
    res.status(InternalServerError).send("Server error");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email: email, isAdmin: true });
    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);

      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin/dashboard"); //admin-dashboard
      } else {
        return res.redirect("/admin/login");
      }
    } else {
      return res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Admin login error", error);
    return res.redirect("/admin/pageerror");
  }
};

const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {

      // Find top 10 products
      let topProducts = await Order.aggregate([
        { $unwind: '$orderItems' },
        { $lookup: {
            from: "products",
            localField: "orderItems.product",
            foreignField: "_id",
            as: "productDetails"
          } 
        },
        {
          $group: {
            _id: "$productDetails._id",
            totalSales: {$sum: "$orderItems.quantity"},
            productName: {$first: "$productDetails.productName"}
          }
        },
        {$sort: {totalSales: -1}},
        {$limit: 10}
      ]);
      // console.log("top product:", topProducts);

      // Find top 10 categories
      let topCategories = await Order.aggregate([
        {$unwind: '$orderItems'},
        {
          $lookup: {
            from: "products",
            localField: "orderItems.product",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        {$unwind: "$productDetails"},
        {
          $lookup: {
            from: "categories",
            localField: "productDetails.category",
            foreignField: "_id",
            as: "categoryDetails"
          }
        },
        {$unwind: "$categoryDetails"},
        {
          $group: {
          _id: "$categoryDetails._id",
          categoryName: {$first: "$categoryDetails.name"},
          totalSalesPrice: {$sum:"$finalAmount"},
          totalSalesQty: {$sum: "$orderItems.quantity"}
          }
        }
      ]);
      console.log("Top category:", topCategories);

      return res.render("dashboard", {
        status: true,
        message: "Dashboard rendering successfull",
        topProducts,
        topCategories,
      });

    } catch (error) {

      console.error("Error at render dashboard", error);
      res.redirect("/admin/pageerror");

    }
  }
};

const adminLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error at destroying session", err);
        res.redirect("/admin/pageerror");
      }

      res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("Unexpected error during logout", error);
    res.redirect("/admin/pageerror");
  }
};

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageError,
  adminLogout,
};
