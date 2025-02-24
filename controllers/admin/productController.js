const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
// const Brand = require("../../models/brandSchema");   //Not setup now
const User = require("../../models/userSchema");

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');   //For img resize width and height



const getAddProduct = async (req, res) => {
    try {

        const categoryDat = await Category.find({isListed: true});

    res.render("product-add", {
        cateData: categoryData,
    });
        
    } catch (error) {

        console.error("Error at get add product", error);
        res.redirect("/admin/pageerror");
        
    }
};






module.exports = {
    getAddProduct,
}