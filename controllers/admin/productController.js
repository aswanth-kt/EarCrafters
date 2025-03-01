const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');   //For img resize width and height
const { default: mongoose } = require("mongoose");




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
        })
        // .sort({createdAt: -1})
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("category")
        .exec();

        const count = await Product.find({
            $or: [
                {productName: {$regex: new RegExp(".*"+search+".*", "i")}},
                // {category: {$regex: new RegExp(".*"+search+".*", "i")}},
            ]
        }).countDocuments();

        const category = await Category.find({isListed: true});

        if (category) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                search: search  // for search values
            })
        } else {
            res.render("page-404")
        }
        
    } catch (error) {

        console.error("Error at get all products", error);
        res.redirect("/admin/pageerror")
        
    }
};



//Add Product Offer
const addProductOffer = async (req, res) => {
    try {

        const {productId, percentage} = req.body;        

        // Check if product exists
        const findProduct = await Product.findOne({_id: productId});
        if (!findProduct) {
            return res.status(404).json({status: false, message: "Product not found"});
        }

        // Check if category exists
        const findCategory = await Category.findOne({_id: findProduct.category});
        if(!findCategory) {
            return res.status(404).json({status: false, message: "Category not found"});
        }

        // if the category offer is grater than product offer
        if (findCategory.categoryOffer > percentage) {
            return res.json({status: false, message: "This product category already has a category offer"});
        }

        // Apply product offer
        findProduct.salePrice = findProduct.regularPrice - Math.round((findProduct.regularPrice * (percentage / 100)));
        findProduct.productOffer = parseInt(percentage);
            await findProduct.save();

            findCategory.categoryOffer = 0;     //if you use the product offer, set category offer to zero
            await findCategory.save();
            
            return res.status(200).json({status: true});
        
    } catch (error) {
        
        console.error("Error at add Product offer", error);
        res.redirect("/admin/pageerror");
        // res.status(500).json({status: false, message: "Internal server error"});

    }
};



// Remove product offer
const removeProductOffer = async (req, res) => {
    try {

        const {productId} = req.body;

        // Check if product exists
        const findProduct = await Product.findOne({_id: productId});
        if (!findProduct) {
            return res.status(404).json({status: false, message: "Product not found"});
        };

        //Offer reset
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice + Math.round(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;
        await findProduct.save()

        return res.status(200).json({status: true});
        
    } catch (error) {

        console.error("Error at Remove product offer", error);
        res.redirect("/admin/pageerror");
        // res.status(500).json({status: false, message: "Internal server error"});
        
    }
};



// Block products
const blockProduct = async (req, res) => {
    try {

        const productId = req.query.id;
        await Product.updateOne({_id: productId}, {$set: {isBlock: true}});
        return res.redirect("/admin/products");

    } catch (error) {

        console.error("Error at Block products", error);
        return res.redirect("/admin/pageerror");
        
    }
};



// Unblock products
const unblockProduct = async (req, res) => {
    try {

        const productId = req.query.id;
        await Product.updateOne({_id: productId}, {$set: {isBlock: false}});
        return res.redirect("/admin/products");
        
    } catch (error) {

        console.error("Error at Unblock products", error);
        return res.redirect("/admin/pageerror");
        
    }
};



// Get edit product page
const getEditProduct = async (req, res) => {
    try {

        const productId = req.query.id;
        const productData = await Product.findOne({_id: productId});
        const categoryData = await Category.find({})    // store all cate data for show the dropdown menu
        res.render("product-edit", {            
            product: productData,
            category: categoryData
        });        
        
    } catch (error) {
        
        console.error("Error at Get edit product", error);
        res.redirect("/admin/pageerror");

    }
};



// Edit product
const editProduct = async (req, res) => {
    try {

        const productId = req.params.id;
        const product = await Product.findOne({_id: productId});

        const data = req.body;
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: {$ne: productId}
        });

        if (existingProduct) {
            return res.status(400).json({status: false, error: "Product with this name already exists, Please try another name."})
        };

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            };
        };

        const updateFields = {
            productName: data.productName,
            description: data.descriptionData,
            category: data.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            color: data.color,
            // productImage: data.productImage
        };
        if (req.files.length > 0) {
            updateFields.$push = {productImage: {$each: images}};
        };

        await Product.findByIdAndUpdate(productId, updateFields, {new: true});
        res.redirect("/admin/products");

    } catch (error) {
        
        console.error("Error at edit product", error);
        res.redirect("/admin/pageerror");
    };
};



// Delete single img at edit time
const deleteSingleImage = async (req, res) => {
    try {

        const {imageNameToServer, productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,
            {$pull:{
                productImage: imageNameToServer
            }}
        );

        const imagePath = path.join("public", "uploads", "re-images", imageNameToServer);
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`image ${imageNameToServer} delete successfully`);
        } else {
            console.log("Image not found");    
        }
        
        res.status(200).json({status: true});
        
    } catch (error) {

        console.error("Error at Delete single image", error);
        res.redirect("/admin/pageerror");
        
    }
};




const deleteProduct = async (req, res) => {
    try {

        const {id} = req.query;
        console.log("id :", id);
        const findProduct = await Product.findById(id);
        if (!findProduct) {
            return res.status(400).json({message: "Product not found"});
        }
        console.log("findPro:",findProduct);
        
        await Product.findByIdAndDelete(id);
        return res.redirect("/admin/products");
        
    } catch (error) {
        
        console.error("Error in Delete product", error);
        return res.status(500).json("Internal server error");
    }
}






module.exports = {
    getAddProduct,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    deleteProduct,
}