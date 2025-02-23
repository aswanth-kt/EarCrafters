const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");



const categoryInfo = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;     // Parse query parameters
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
        .sort({createdAt : -1})  
        .skip(skip)
        .limit(limit);

        const totalCategory = await Category.countDocuments();
        const totalPage = Math.ceil(totalCategory / limit);

        res.render("category", {
            cateData : categoryData,
            currentPage : page,
            totalPages : totalPage,
            totalCategories : totalCategory
        });
        
    } catch (error) {

        console.error("Error at category info", error);
        res.status(500).redirect("/pageerror");
        
    }
};



// Create a new category
const addCategory = async (req, res) => {
    try {

        let {name, description} = req.body
        // Trim inputs
        name = name.trim();
        description = description.trim();

        const existingCategory = await Category.findOne({name : {$regex : `^${name}$`, $options : 'i'} });
        if (existingCategory) {
            return res.status(400).json({error : "Category already exists."});
        }

        // Create and save to category
        const newCategory = new Category({name, description})
        await newCategory.save();

        return res.status(201).json({message : "Category added successfully."})
        
    } catch (error) {

        return res.status(500).json({error : "Internal server error."});
        
    }
};




// Add category offer
const addCategoryOffer = async (req, res) => {
    try {

        // Storing data from frondend (ajax-body)
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        const categoryData = await Category.findById(categoryId);
        if (!categoryData) {
            return res.status(404).json({status: false, message: "Category not found"});
        }

        const products = await Product.find({category: categoryData._id});
        //Check the product offer > category offer
        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({status: false, message: "Products within this category already have product offer."});
        }

        // If product has no offer, Update offer in category
        await Category.updateOne({_id: categoryId}, {$set: {categoryOffer: percentage}});

        //So if any offer in products, clear product offer
        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }

        res.json({status: true})
        
    } catch (error) {

        res.status(500).json({status: false, message: "Internal server error"});
        console.error("Error at add category offer", error)
        
    }
};



// Remove catgory offer
const removeCategoryOffer = async (req, res) => {
    try {

        const categoryId = req.body.categoryId;      //Receive id from frondend(using ajax)

        const categoryData = await Category.findById(categoryId);
        if (!categoryData) {
            return res.status(404).json({status: false, message: "Category not found"});
        }

        const percentage = categoryData.categoryOffer;
        const products = await Product.find({category: categoryData._id});
        if (products.length > 0) {
            for (const product of products) {
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
            }
        }

        categoryData.categoryOffer = 0;
        await categoryData.save();
        res.json({status: true});
        
    } catch (error) {

        res.status(500).json({status: false, message: "Internal server error", error})
        console.error("Error at remove category offer", error);
    };
};



// Update to Unlisted category
const getListCategory = async (req, res) => {
    try {

        const categoryId = req.query.id;

        await Category.updateOne({_id: categoryId}, 
            {$set: {isListed: false}});

            res.redirect("/admin/category");
        
    } catch (error) {

        res.redirect("/admin/pageerror");
        console.error("Error at get listed category", error);
        
    }
};



// Updated to Listed category
const getUnListCategory = async (req, res) => {
    try {

        const categoryId = req.query.id;

        await Category.updateOne({_id: categoryId},
            {$set: {
                isListed: true
            }}
        );
        res.redirect("/admin/category");
        
    } catch (error) {

        res.redirect("/admin/pageerror");
        console.error("Error at get unlist category", error);
        
    }
};



// Load Edit page
const getEditCategory = async (req, res) => {
    try {

        const categoryId = req.query.id;
        const categoryData = await Category.findOne({_id: categoryId});
        
        res.render("edit-category", {categoryData: categoryData});
        
    } catch (error) {

        res.redirect("/admin/pageerror");
        console.error("Error at get edit category", error);
        
    }
};



// Edit categories
const editCategory = async (req, res) => {
    try {

        const categoryId = req.params.id;
        const {categoryName, description} = req.body;

        const existingCategory = await Category.findOne({name: categoryName});

        if (existingCategory) {
            res.status(400).json({error: "Category name already exists, Please choose another name"});
        };

        const updatedCategory = await Category.findByIdAndUpdate(categoryId, 
            {
                name: categoryName,
                description: description
            }, {new: true}
        );

        if (updatedCategory) {
            res.redirect("/admin/category");
        } else { 
            res.status(400).json({error: "Category not found"});
        }

        
    } catch (error) {

        res.status(500).json({error: "Internal server error"});
        console.error("Error at edit category", error);
        
    }
};



//Delete category
const deleteCategory = async (req, res) => {
    try {

        const categoryId = req.params.id;
        const {categoryName, description} = req.body;

        const hasCategory = await Category.findById(categoryId);
        if (!hasCategory) {
            res.status(400).json({error: "Category is not found"});
        } else {
            await Category.findByIdAndDelete(categoryId);
            res.redirect("/admin/category");
        }
        
    } catch (error) {

        res.status(500).json({error: "Internal server error"});
        console.error("Error at delete category", error);
        
    }
}





module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnListCategory,
    getEditCategory,
    editCategory,
    deleteCategory,
}