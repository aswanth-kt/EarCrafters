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
        },
        {$sort: {totalSalesPrice: -1}},
        {$limit: 10},
      ]);
      // console.log("Top category:", topCategories);


      // Yealy data for graph
      const yearlyData = await Order.aggregate([
        {$match:
          {finalAmount: {$exists: true}}},
          {$addFields: {"year": {$year: "$createdOn"}}},
          {
            $group: {
              _id: "$year",
              totalSalesInYearly: {$sum: "$finalAmount"}
            },
          },
          {$sort: {_id: -1}},
          {$limit: 5},
      ]);
      // console.log("Yearly data:", yearlyData);

      //For find 5 years data
      const currentYear = yearlyData?.[0]?._id || new Date().getFullYear();
  
      const yearltDataMap = new Map(yearlyData.map(item => [item._id, item.totalSalesInYearly]));
      const formattedYearlyWiseData = [];

      for (let year = currentYear; year >= currentYear - 4; year--) {
        formattedYearlyWiseData.push({
          year: year,
          totalSales: yearltDataMap.get(year) || 0
        });
      };
      // console.log('formattedYearlyWiseData:', formattedYearlyWiseData);

      // Monthly data for graph
      const monthlyData = await Order.aggregate([
        {$match:
          {finalAmount: {$exists: true}}},
          {$addFields: {"year": {$year: "$createdOn"}}},
          {$addFields: {"month": {$month: "$createdOn"}}},
          {
            $group: {
              _id: "$month",
              totalSalesInMonthly: {$sum: "$finalAmount"}
            },
          },
          {$sort: {_id: -1}},
          {$limit: 5},
      ]);
      // console.log("Monthly data:", monthlyData);

      const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = monthlyData?.[0]?._id || (new Date().getMonth() + 1);
      // console.log("current month:", currentMonth);

      const monthlyDataMap = new Map(monthlyData.map(item => [item._id, item.totalSalesInMonthly]));
      // console.log("map", monthlyDataMap)  // Map(4) { 6 => 124600, 5 => 112646, 4 => 416364, 3 => 118343 }

      let formattedMonthWiseData = [];
      for (let month = currentMonth; month >= 1; month--) {
        formattedMonthWiseData.push({
          month: months[month],
          totalSales: monthlyDataMap.get(month) || 0
        })
      };
      // console.log("formattedMonthWiseData:", formattedMonthWiseData);

      // Daily data for graph.
      const dailyData = await Order.aggregate([
        {
          $match: {
            finalAmount: {$exists: true}
          }
        },
        {
          $group: {
            _id: {
              $dateTrunc: {
                date: "$createdOn",
                unit: "day"
              }
            },
            totalSalesInDaily: {$sum: "$finalAmount"}
          }
        },
        {$sort: {_id: -1}},  // sort by Date
        {$limit: 15},   //Set last 15 data
        {
          $project: {
            _id: 0,
            date: {
              $dateToString: {
                format: "%d-%m-%Y",
                date: "$_id"
              }
            },
            totalSalesInDaily: 1
          }
        }
      ]);
      // console.log("Daily data:", dailyData);

      const formattedDailyhWiseData = dailyData.map((data) => {
        return {
          day: data.date,
          totalSales: data.totalSalesInDaily || 0
        }
      });
      // console.log("formattedDailyhWiseData:", formattedDailyhWiseData);

      return res.render("dashboard", {
        status: true,
        topProducts,
        topCategories,
        formattedYearlyWiseData,
        formattedMonthWiseData,
        formattedDailyhWiseData,
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
