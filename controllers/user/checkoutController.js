const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");





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

        const cart = await Cart.findOne({_id: {$in: user.cart}}).populate("items.productId");

        const userAddress = await Address.findOne({userId: userId}).select("address");

        const notDefaultAddress = userAddress 
          ? userAddress.address.find((addr) => addr.isDefault === false) : null; 
        console.log("notDefaultAddress :", notDefaultAddress);

        // Only default address
        const defaultAddress = userAddress 
          ? userAddress.address.find((addr) => addr.isDefault) : null;  

        const cartItems = cart ? cart.items : [];
        // console.log(userAddress.address[0].name)

        res.render("checkout",{
            user,
            cartItems,
            addresses : userAddress ? userAddress.address : [],
            defaultAddress: defaultAddress || {},
            userAddress: userAddress,
            notDefaultAddress,
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
  }






module.exports = {
    getCheckoutPage,
    updateDefaultAddress,
    getEditCheckoutAddress,
}