const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");





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

        // Find wallet and populate transactions
        const wallet = await Wallet.findOne({userId: userData._id})
        .populate('transactions')
        .sort({'transactions.createdAt': -1});
        
        if (!wallet) {
            return res.status(404).json({
                status: false,
                message: "Wallet not found"
            });
        }

        // console.log("Wallet.transactions", wallet.transactions)
        return res.status(200).json({
            status: true,
            transactions: wallet.transactions || []
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
        }

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

        console.log("wallet at add money:", wallet)//

        return res.status(200).json({
            status: true,
            message: "Money added successfully",
            wallet: savedWallet,
        })
        
    } catch (error) {
        
        console.error("Error in add money to wallet", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error" + error.message,
        })
        
    }
};





module.exports = {
    getWalletHistory,
    addMoneyToWallet,
}