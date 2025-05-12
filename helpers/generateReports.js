const PdfPrinter = require("pdfmake");
const ExcelJS = require("exceljs");
const Order = require("../models/orderSchema");

// Define fonts for pdfmake
const fonts = {
  Roboto: {
    normal: "public/fonts/pdfFonts/Roboto-Regular.ttf",
    bold: "public/fonts/pdfFonts/Roboto-Medium.ttf",
    italics: "public/fonts/pdfFonts/Roboto-Italic.ttf",
    bolditalics: "public/fonts/pdfFonts/Roboto-MediumItalic.ttf",
  },
};

const printer = new PdfPrinter(fonts);

async function generatePDFReport(
  filterType,
  specificDate,
  startDate,
  endDate,
  includeDiscounts,
  deliveredOnly = true
) {
  // Fetch sales data based on filter criteria
  let matchCriteria = {};

  // Always set status to Delivered when deliveredOnly is true
  if (deliveredOnly) {
    matchCriteria.status = "Delivered";
  }

  // Add date filters based on filterType
  if (filterType === "custom") {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set to end of day

    matchCriteria.createdOn = { $gte: start, $lte: end };
  } else if (filterType === "daily") {
    if (!specificDate) {
      throw new Error("Specific date is required for daily report");
    }

    const specificDateObj = new Date(specificDate);
    const startOfDay = new Date(
      specificDateObj.getFullYear(),
      specificDateObj.getMonth(),
      specificDateObj.getDate()
    );
    const endOfDay = new Date(
      specificDateObj.getFullYear(),
      specificDateObj.getMonth(),
      specificDateObj.getDate() + 1
    );

    matchCriteria.createdOn = {
      $gte: startOfDay,
      $lt: endOfDay,
    };
  } else if (filterType === "weekly") {
    matchCriteria.createdOn = {
      $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
      $lte: new Date(),
    };
  } else if (filterType === "monthly") {
    matchCriteria.createdOn = {
      $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      $lte: new Date(),
    };
  }

  const salesData = await Order.find(matchCriteria)
    .populate("userId", "name")
    .populate("orderItems.product", "productName");

  if (filterType === "custom" && salesData.length === 0) {
    // eslint-disable-next-line no-undef
    return Buffer.from("No orders found for the selected date range.");
  }

  // Calculate overall sales count, order amount, and discount
  const overallSalesCount = salesData.length;
  const overallOrderAmount = salesData.reduce(
    (acc, order) => acc + order.finalAmount,
    0
  );
  const overallDiscount = salesData.reduce(
    (acc, order) => acc + order.discount,
    0
  );

  // Prepare the document definition
  const docDefinition = {
    pageSize: { width: 1200, height: 1200 }, // Custom larger page size
    content: [
      {
        image: "public/img/Logo/earCraftersLogo.png",
        width: 100,
      },
      {
        text: "Sales Report",
        style: "header",
      },
      {
        text: `Overall Sales Count: ${overallSalesCount}`,
        style: "subheader",
      },
      {
        text: `Overall Order Amount: ${overallOrderAmount.toFixed(2)}`,
        style: "subheader",
      },
      {
        text: `Overall Discount: ${overallDiscount.toFixed(2)}`,
        style: "subheader",
      },
      {
        text: `Filter: ${
          filterType.charAt(0).toUpperCase() + filterType.slice(1)
        } ${
          filterType === "custom" ? `(from ${startDate} to ${endDate})` : ""
        }`,
        style: "subheader",
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
          body: [
            [
              { text: "Order ID", style: "tableHeader" },
              { text: "Total Amount", style: "tableHeader" },
              { text: "Discount", style: "tableHeader" },
              { text: "Quantity", style: "tableHeader" },
              { text: "Payment Type", style: "tableHeader" },
              { text: "Date", style: "tableHeader" },
              { text: "User Name", style: "tableHeader" },
              { text: "Products", style: "tableHeader" },
            ],
            ...salesData.map((order, index) => [
              {
                text: order.orderId,
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                margin: [5, 5, 5, 5],
              },
              {
                text: order.finalAmount.toFixed(2),
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                alignment: "right",
                margin: [5, 5, 5, 5],
              },
              {
                text: includeDiscounts ? order.discount.toFixed(2) : "N/A",
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                alignment: "right",
                margin: [5, 5, 5, 5],
              },
              {
                text: order.orderItems.reduce(
                  (sum, item) => sum + item.quantity,
                  0
                ),
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                alignment: "center",
                margin: [5, 5, 5, 5],
              },
              {
                text: order.paymentMethod,
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                alignment: "center",
                margin: [5, 5, 5, 5],
              },
              {
                text: order.createdOn.toLocaleDateString(),
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                alignment: "center",
                margin: [5, 5, 5, 5],
              },
              {
                text: order.userId ? order.userId.name : "Unknown", // Updated to populate userId
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                margin: [5, 5, 5, 5],
                maxWidth: 100,
                noWrap: true,
              },
              {
                text: order.orderItems
                  .map((item) => item.product.productName) // Updated to access populated productName
                  .join(", "),
                fillColor: index % 2 === 0 ? "#d8eafc" : null,
                margin: [5, 5, 5, 5],
                maxWidth: 150,
                noWrap: false,
              },
            ]),
          ],
          layout: {
            hLineWidth: function (i, node) {
              return 0;
            },
            vLineWidth: function (i, node) {
              return 0;
            },
            hLineColor: function (i, node) {
              return "#fff";
            },
            vLineColor: function (i, node) {
              return "#fff";
            },
            paddingLeft: function (i) {
              return 5;
            },
            paddingRight: function (i) {
              return 5;
            },
            paddingTop: function (i) {
              return 5;
            },
            paddingBottom: function (i) {
              return 5;
            },
          },
        },
      },
      {
        text: `Report generated on: ${new Date().toLocaleString()}`,
        style: "footer",
        alignment: "right",
        margin: [0, 20, 0, 0],
      },
    ],
    styles: {
      header: {
        fontSize: 28,
        bold: true,
        alignment: "center",
      },
      subheader: {
        fontSize: 12,
        bold: true,
        margin: [0, 10, 0, 5],
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "black",
      },
      footer: {
        fontSize: 10,
        italics: true,
        color: "gray",
      },
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  let buffers = [];
  pdfDoc.on("data", buffers.push.bind(buffers));
  pdfDoc.on("end", () => {
    // eslint-disable-next-line no-undef
    const pdfData = Buffer.concat(buffers);
    return pdfData;
  });
  pdfDoc.end();

  return new Promise((resolve) => {
    pdfDoc.on("end", () => {
      // eslint-disable-next-line no-undef
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
  });
}

async function generateExcelReport(
  filterType,
  specificDate,
  startDate,
  endDate,
  includeDiscounts,
  deliveredOnly = true
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report");

  let matchCriteria = {};
  if (deliveredOnly) {
    matchCriteria.status = "Delivered";
  }
  if (filterType === "custom") {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    matchCriteria.createdOn = { $gte: start, $lte: end };
  } else if (filterType === "daily") {
    if (!specificDate) {
      throw new Error("Specific date is required for daily report");
    }

    const specificDateObj = new Date(specificDate);
    const startOfDay = new Date(
      specificDateObj.getFullYear(),
      specificDateObj.getMonth(),
      specificDateObj.getDate()
    );
    const endOfDay = new Date(
      specificDateObj.getFullYear(),
      specificDateObj.getMonth(),
      specificDateObj.getDate() + 1
    );

    matchCriteria.createdOn = {
      $gte: startOfDay,
      $lt: endOfDay,
    };
  } else if (filterType === "weekly") {
    matchCriteria.createdOn = {
      $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
      $lte: new Date(),
    };
  } else if (filterType === "monthly") {
    matchCriteria.createdOn = {
      $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      $lte: new Date(),
    };
  }
  const salesData = await Order.find(matchCriteria)
    .populate("userId", "name")
    .populate("orderItems.product", "productName");

  if (filterType === "custom" && salesData.length === 0) {
    worksheet.addRow(["No orders found for the selected date range."]);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  // Define column headers first
  worksheet.columns = [
    { header: "Order ID", key: "orderId", width: 30 },
    { header: "Total Amount", key: "totalAmount", width: 15 },
    { header: "Discount", key: "discount", width: 15 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Payment Type", key: "paymentType", width: 15 },
    { header: "Date", key: "date", width: 20 },
    { header: "User Name", key: "userName", width: 25 },
    { header: "Products", key: "products", width: 30 },
  ];

  // Merge cells for the title (A1:D2)
  worksheet.mergeCells("A1:H2");
  const headerCell = worksheet.getCell("A1");
  headerCell.value = "EarCrafters";
  headerCell.font = { size: 18, bold: true };
  headerCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A3:H3");
  const subHeaderCell = worksheet.getCell("A3");
  subHeaderCell.value = "Sales report";
  subHeaderCell.font = { size: 11, italic: true };
  subHeaderCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.addRow([]);

  // Add column headers to the worksheet
  const headerRow = worksheet.addRow({
    orderId: "Order ID",
    totalAmount: "Total Amount",
    discount: "Discount",
    quantity: "Quantity",
    paymentType: "Payment Type",
    date: "Date",
    userName: "User Name",
    products: "Products",
  });
  headerRow.font = { bold: true }; // Make header row bold

  // Add sales data to the worksheet
  salesData.forEach((order) => {
    const quantity = order.orderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    worksheet.addRow({
      orderId: order.orderId,
      totalAmount: order.finalAmount,
      discount: includeDiscounts ? order.discount : "N/A",
      quantity,
      paymentType: order.paymentMethod,
      date: order.createdOn.toLocaleDateString(),
      userName: order.userId ? order.userId.name : "Unknown",
      products: order.orderItems
        .map((item) => item.product.productName)
        .join(", "),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// eslint-disable-next-line no-undef
module.exports = {
  generatePDFReport,
  generateExcelReport,
};
