const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});





const getWalletHistory = async (req, res) => {
    try {
        const userId = req.session.user;
        
        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }

        // Get page from query or default to 1
        const page = parseInt(req.query.page) || 1;
        const limit = 7;
        const skip = (page - 1) * limit;
        
        // Find wallet
        const wallet = await Wallet.findOne({userId: userData._id});
        
        if (!wallet) {
            return res.status(404).json({
                status: false,
                message: "Wallet not found"
            });
        }

        // Sort transactions by date (newest first)
        const sortedTransactions = wallet.transactions.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Calculate total pages
        const totalTransactions = sortedTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        
        // Paginate the transactions
        const paginatedTransactions = sortedTransactions.slice(skip, skip + limit);

        return res.status(200).json({
            status: true,
            transactions: paginatedTransactions,
            totalPages: totalPages,
            currentPage: page
        });
        
    } catch (error) {
        console.error("Error fetching wallet history", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};


const addMoneyToWallet = async (req, res) => {
    try {

        // From frondend data
        const inputAmount = parseFloat(req.body.amount);
        console.log("Input amout:", inputAmount)

        if (isNaN(inputAmount) || inputAmount <= 0) {
            return res.status(400).json({
                status: false,
                message: "Please enter a valid amount greater that zero"
            });
        };

        const userId = req.session.user;

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        };

        let wallet = await Wallet.findOne({userId: userData._id});

        // Create wallet if it doesn't exist
        if (!wallet) {
            console.log("Creating new wallet for user");
            wallet = new Wallet({
                userId: userData._id,
                balance: 0,
                transactions: []
            });
        };

        // Add balance
        const previousBalance = wallet.balance;
        wallet.balance += inputAmount;
        console.log(`Updating balance from ${previousBalance} to ${wallet.balance}`);

        // Record transaction
        wallet.transactions.push({
            type: 'credit',
            amount: inputAmount,
            description: 'Added money to wallet',
            balance: wallet.balance,
            createdAt: new Date(),
        });
        
        const savedWallet = await wallet.save();    //Save wallet details
        console.log("Wallet saved successfully:", !!savedWallet);

        console.log("wallet at add money:", !!wallet)

        // Razorpay
        const options = {
            amount: Math.round(inputAmount * 100),
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
        savedWallet.razorpayOrderId = razorpayOrder.id;
        await savedWallet.save();
        

        return res.status(200).json({
            status: true,
            message: "Money added successfully",
            wallet: savedWallet,
            razorpayOrderId: razorpayOrder.id,
            amount: Math.round(inputAmount * 100),
            currency: "INR",
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            userData,
        })
        
    } catch (error) {
        
        console.error("Error in add money to wallet", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error" + error.message,
        })
        
    }
};


// Wallet failed by razorpay
// const addMoneyFailed = async (req, res) => {
//     try {

//         const inputAmount = parseFloat(req.query.amount);
//         console.log("Input amount:", inputAmount);

//         if (isNaN(inputAmount) || inputAmount <= 0) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Please enter a valid amount greater that zero"
//             });
//         };

//         const userId = req.session.user;
//         const userData = await User.findById(userId);

//         if (!userData) {
//             return res.status(400).json({
//                 status: false,
//                 message: "User not found"
//             })
//         };

//         const wallet = await Wallet.findOne({userId: userData._id});
//         if (!wallet) {
//             console.log("Creating new wallet for user");
//             wallet = new Wallet({
//                 userId: userData._id,
//                 balance: 0,
//                 transactions: []
//             });
//         };

//         // Reduce balance
//         const currentBalance = wallet.balance;
//         console.log(`Updating balance from ${currentBalance} to ${wallet.balance}`);

//         // Record transaction
//         wallet.transactions.push({
//             type: 'failed',
//             amount: inputAmount,
//             description: 'The transaction failed',
//             balance: currentBalance,
//             createdAt: new Date(),
//         });
        
//         const savedWallet = await wallet.save();    //Save wallet details
//         console.log("Wallet saved successfully:", !!savedWallet);

//         console.log("wallet at add money:", !!wallet)

//         // Razorpay
//         const options = {
//             amount: Math.round(inputAmount * 100),
//             currency: "INR",
//             receipt: `receipt_${new Date().getTime()}`,
//             payment_capture: 1,
//         };

//         // console.log("Razorpay instance:", razorpay);
//         console.log("Creating order with options:", options);

//         if (!razorpay) {
//             console.error("Razorpay instance not initialized");
//             return res.status(500).json({
//                 status: false,
//                 message: "Payment gateway not properly configured"
//             });
//         };
//         const razorpayOrder = await razorpay.orders.create(options);
//         savedWallet.razorpayOrderId = razorpayOrder.id;
//         await savedWallet.save();
        

//         return res.status(200).json({
//             status: false,
//             message: "The transaction failed",
//             wallet: savedWallet,
//             razorpayOrderId: razorpayOrder.id,
//             amount: Math.round(inputAmount * 100),
//             currency: "INR",
//             razorpayKey: process.env.RAZORPAY_KEY_ID,
//             userData,
//         })
        
//     } catch (error) {
//         console.error("Error in add money failed", error);
//         return res.status(500).json({
//             status: false,
//             message: "Internal server error"
//         })
//     }
// }


const addMoneyFailed = async (req, res) => {
    try {
        const inputAmount = parseFloat(req.query.amount);
        console.log("Input amount:", inputAmount);

        if (isNaN(inputAmount) || inputAmount <= 0) {
            return res.status(400).json({
                status: false,
                message: "Please enter a valid amount greater than zero"
            });
        };

        const userId = req.session.user;
        const userData = await User.findById(userId);

        if (!userData) {
            return res.status(400).json({
                status: false,
                message: "User not found"
            });
        };

        let wallet = await Wallet.findOne({userId: userData._id});
        if (!wallet) {
            console.log("Creating new wallet for user");
            wallet = new Wallet({
                userId: userData._id,
                balance: 0,
                transactions: []
            });
        };

        // For failed transactions, we don't modify the balance
        const currentBalance = wallet.balance;
        
        // Record transaction as failed but don't change the balance
        wallet.transactions.push({
            type: 'failed',
            amount: inputAmount,
            description: 'Payment failed',
            balance: currentBalance, // Keep the same balance
            createdAt: new Date(),
        });
        
        const savedWallet = await wallet.save();
        console.log("Wallet saved successfully:", !!savedWallet);

        // Razorpay
        const options = {
            amount: Math.round(inputAmount * 100),
            currency: "INR",
            receipt: `receipt_${new Date().getTime()}`,
            payment_capture: 1,
        };

        console.log("Creating order with options:", options);

        if (!razorpay) {
            console.error("Razorpay instance not initialized");
            return res.status(500).json({
                status: false,
                message: "Payment gateway not properly configured"
            });
        };
        
        const razorpayOrder = await razorpay.orders.create(options);
        // Don't save the razorpayOrderId to the wallet for failed transactions
        
        return res.status(200).json({
            status: true, // Change to false to indicate failure
            message: "The transaction failed",
            // wallet: savedWallet,
            razorpayOrderId: razorpayOrder.id,
            amount: Math.round(inputAmount * 100),
            currency: "INR",
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            // userData,
        });
        
    } catch (error) {
        console.error("Error in addMoneyFailed:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while processing the failed transaction"
        });
    }
}




module.exports = {
    getWalletHistory,
    addMoneyToWallet,
    addMoneyFailed,
}