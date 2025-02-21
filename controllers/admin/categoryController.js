const Category = require("../../models/categorySchema");



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





module.exports = {
    categoryInfo,
    addCategory,
}