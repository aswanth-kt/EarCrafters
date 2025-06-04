const PdfPrinter = require('pdfmake');
const Order = require("../models/orderSchema");
const Address = require("../models/addressSchema");
const User = require("../models/userSchema");


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

async function generateInvoicePDF(orderId) {
    const order = await Order.findOne({ _id: orderId }).populate(
      "orderItems.product"
    ); 
  
    if (!order) {
      throw new Error("Order not found");
    }
  
  
    const userAddresses = await Address.findOne({ userId: order.userId });
  
    const user = await User.findOne({ _id: order.userId });
  
    if (!userAddresses) {
      throw new Error("User addresses not found");
    }
  
    // Extract the default address or the first address
    const address =
      userAddresses.address.find((addr) => addr.isDefault) ||
      userAddresses.address[0];
  
    if (!address) {
      throw new Error("No address found for the user");
    }
  
    const invoiceNumber = `INV-${Math.floor(Math.random() * 1000000)}`; // Random invoice number
    // const invoiceNumber = `INV-${orderId}-${new Date().getTime()}`;

    const orderDate = new Date(order.createdOn).toLocaleDateString();
  
    // Prepare the table rows for ordered items
    const tableBody = [
      ["Product Name", "Quantity", "Price", "Total"],
      ...order.orderItems.map((item) => {
        const product = item.product;
        const price = item.price || product.salePrice; // Use item price if available, otherwise use product salePrice
        const total = price * item.quantity;
        return [
          product.productName,
          item.quantity,
          `₹${price.toFixed(2)}`,
          `₹${total.toFixed(2)}`,
        ];
      }),
    ];
  
    const docDefinition = {
      pageMargins: [40, 60, 40, 80], // Adjust bottom margin to leave space for the footer
      content: [
        // Header Section
        {
          columns: [
            {
              image: "public/img/Logo/earCraftersLogo.png",
              width: 100,
            },
            {
              text: "Invoice",
              style: "header",
              alignment: "right",
              margin: [0, 20, 0, 0],
            },
          ],
        },
        {
          text: "EarCrafters",
          style: "companyName",
          alignment: "center",
          margin: [0, 10, 0, 20],
        },
    
        // Invoice and Order Details
        {
          columns: [
            {
              text: `Invoice Number: ${invoiceNumber}`,
              style: "subheader",
            },
            {
              text: `Order Date: ${orderDate}`,
              style: "subheader",
              alignment: "right",
            },
          ],
          margin: [0, 0, 0, 10],
        },
        {
          text: `Order ID: ${orderId}`,
          style: "subheader",
          margin: [0, 0, 0, 10],
        },
        {
          text: `Payment Method: ${order.paymentMethod}`,
          style: "subheader",
          margin: [0, 0, 0, 10],
        },
        {
          text: [
            { text: "Delivery Address:\n\n", style: "subheaderBold" }, // Bold label
            `${user.name}\n\n`,
            `${address.name}\n`,
            `${address.city}\n`,
            `${address.state}\n`,
            `${address.pincode}\n`,
            `Phone: ${address.phone}`,
          ],
          style: "subheader",
          margin: [0, 0, 0, 20],
        },
    
        // Product Table
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto"],
            body: tableBody,
          },
          layout: "lightHorizontalLines", // Add light horizontal lines for a clean look
          margin: [0, 0, 0, 20],
        },
        {
          text: `GST 18%: ₹${order.gst.toFixed(2)}`,
          style: "gst",
          alignment: "right",
          margin: [0, 10, 0, 20],
        },
        order.couponApplied && order.discount > 0
          ? {
              text: `Discount Applied: ₹${order.discount.toFixed(2)}`,
              style: "discount",
              alignment: "right",
              margin: [0, 10, 0, 10],
            }
          : {}, // Only display if coupon was applied
    
        // Final Amount
        {
          text: `Final Amount: ₹${order.finalAmount.toFixed(2)}`,
          style: "finalAmount",
          alignment: "right",
          margin: [0, 10, 0, 20],
        },
        {
          text: `Invoice Bill Generated On: ${new Date().toLocaleString()}`, // Current date and time
          style: "footer",
          alignment: "right",
          margin: [0, 30, 0, 0],
        },
      ],
      // Modified footer function to only show thank you message on the last page
      footer: function(currentPage, pageCount) {
        // Only show the thank you message on the last page
        if (currentPage === pageCount) {
          return [
            {
              text: "Thank you for shopping with us!",
              style: "footer",
              alignment: "center",
              margin: [0, 20, 0, 0],
            },
          ];
        }
        // Return empty array for all other pages to have no footer
        return [];
      },
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: "#333",
        },
        companyName: {
          fontSize: 18,
          bold: true,
          color: "#555",
        },
        subheader: {
          fontSize: 12,
          color: "#666",
        },
        subheaderBold: {
          fontSize: 12,
          bold: true,
          color: "#666",
        },
        footer: {
          fontSize: 9,
          italics: true,
          color: "#777",
        },
        discount: {
          fontSize: 9,
          color: "#d32f2f",
          bold: true,
        },
        finalAmount: {
          fontSize: 9,
          bold: true,
          color: "#333",
        },
        gst: {
          fontSize: 12,
          bold: true,
          color: "#333",
        },
        tableHeader: {
          bold: true,
          fontSize: 12,
          color: "#333",
          fillColor: "#f5f5f5", // Light gray background for header
        },
      },
      defaultStyle: {
        font: "Roboto",
      },
    };
    
  
    // Create the PDF and return the buffer
    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      let buffers = [];
      pdfDoc.on("data", buffers.push.bind(buffers));
      pdfDoc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });
  };
  
  module.exports = {
    generateInvoicePDF,
  };