const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
// const Brand = require("../../models/brandSchema");   //Not setup now
const User = require("../../models/userSchema");

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');   //For img resize width and height



const getAddProduct = async (req, res) => {
    try {

        const categoryData = await Category.find({isListed: true});

    res.render("product-add", {
        cateData: categoryData,
    });
        
    } catch (error) {

        console.error("Error at get add product", error);
        res.redirect("/admin/pageerror");
        
    }
};



// Add new product
const addProducts = async (req, res) => {
    try {

        const product = req.body;
        const productExixts = await Product.findOne({
            productName : product.productName
        });

        if (!productExixts) {
            const images = [];
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {

                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({width: 440, height: 440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            } else {
                console.log("No files uploaded");
            };

            const categoryId = await Category.findOne({name: product.category});

            if (!categoryId) {
                return res.status(400).json("Invalid category name");
            }

            const newProduct = new Product({
                productName: product.productName,
                description: product.description,
                // brand: product.brand,
                category: categoryId._id,
                regularPrice: product.regularPrice,
                salePrice: product.salePrice,
                createdAt: new Date(),
                quantity: product.quantity,
                // size: product.size, //Check it!!!!!
                color: product.color,
                productImage: images,
                status: "Available"
            });

            await newProduct.save();
            return res.redirect("/admin/addProducts");

        } else {
            return res.status(400).json("Product already exist. Please try with another name.");
        }
        
    } catch (error) {

        console.error("Error at add products", error);
        return res.redirect("/admin/pageerror");
        
    }
};



// Get all product info
const getAllProducts = async (req, res) => {
    try {

        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        // for search bar
        const productData = await Product.find({
            $or: [
                {productName: {$regex: new RegExp(".*"+search+".*", "i")}}
            ],
        }).limit(limit * 1)
        .skip(page - 1)
        .populate("category")
        .exec();

        const count = await Product.find({
            $or: [
                {productName: {$regex: new RegExp(".*"+search+".*", "i")}}
            ]
        }).countDocuments();

        const category = await Category.find({isListed: true});

        if (category) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category
            })
        } else {
            res.render("page-404")
        }
        
    } catch (error) {

        console.error("Error at get all products", error);
        res.redirect("/admin/pageerror")
        
    }
}






module.exports = {
    getAddProduct,
    addProducts,
    getAllProducts,
}