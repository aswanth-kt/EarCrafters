const Order = require("../../models/orderSchema");
const {
  generatePDFReport,
  generateExcelReport,
} = require("../../helpers/generateReports");

const {
  OK,
  Created,
  BadRequest,
  NotFound,
  InternalServerError,
} = require("../../helpers/httpStatusCodes");

const loadSalesReport = async (req, res) => {
  try {
    const allOrders = await Order.find({});

    if (!allOrders) {
      return res.status(BadRequest).json({
        status: false,
        message: "There is no orders available",
      });
    }

    // Total count of sales
    const overallSalesCount = await Order.countDocuments({
      status: "Delivered",
    });

    // Total of all orders
    const overallOrderAmount = allOrders
      .filter((order) => order.status === "Delivered")
      .reduce((acc, item) => {
        // console.log(acc, item)
        return acc + item.finalAmount;
      }, 0);

    const totalDiscounts = allOrders
      .filter((order) => order.couponApplied && order.status === "Delivered")
      .reduce((acc, item) => acc + item.discount, 0);

    // Net Revenue
    const netRevenue = overallOrderAmount - totalDiscounts;

    // Revenue in percentage
    const discountPercentage = (totalDiscounts / overallOrderAmount) * 100;

    // For pagination
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ status: "Delivered" })
      .populate("userId")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalOrderCount = await Order.countDocuments({});
    const totalPages = Math.ceil(totalOrderCount / limit);

    // Date and one day total sales for chart
    let salesByDate = {};

    orders.forEach(order => {
      let dateKey = order.createdOn.toISOString().slice(0, 10); // 'YYYY-MM-DD'
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = 0;
      }
      salesByDate[dateKey] += order.finalAmount;
    });

    // Prepare data for the chart
    let labels = Object.keys(salesByDate);       
    let totalSales = Object.values(salesByDate); 

    // console.log("dates:", labels);
    // console.log("totalSales:", totalSales);

    res.render("salesReport", {
      overallSalesCount,
      overallOrderAmount,
      totalDiscounts,
      netRevenue,
      discountPercentage,
      orders,
      totalPages,
      currentPage: page,
      labels,
      totalSales,
    });
  } catch (error) {
    console.error("Error in load sales report:", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Generate reports
const exportSalesReport = async (req, res) => {
  try {
    const data = req.body.filterData
      ? typeof req.body.filterData === "string"
        ? JSON.parse(req.body.filterData)
        : req.body.filterData
      : req.body;

    const {
      specificDate,
      week,
      month,
      year,
      startDate,
      endDate,
      format,
      filterType,
    } = data;
    // console.log("Body:", req.body);

    // Assume discounts and coupons are always included by default
    const showDiscount = true;

    // Always filter for delivered orders only
    const deliveredOnly = true;

    if (format === "pdf") {
      const pdfBuffer = await generatePDFReport(
        filterType,
        specificDate,
        startDate,
        endDate,
        showDiscount,
        deliveredOnly
      );

      res.setHeader("Content-Type", "application/pdf");

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.pdf"
      );

      res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await generateExcelReport(
        filterType,
        specificDate,
        startDate,
        endDate,
        showDiscount,
        deliveredOnly
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=sales_report.xlsx"
      );

      res.send(excelBuffer);
    } else {
      res.status(BadRequest).json({
        status: false,
        message: "Invalid format",
      });
    }
  } catch (error) {
    console.error("Error in export sales report:", error);
    return res.status(InternalServerError).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  loadSalesReport,
  exportSalesReport,
};
