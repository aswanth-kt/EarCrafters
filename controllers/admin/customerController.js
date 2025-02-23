const User = require("../../models/userSchema");



const customerInfo = async (req, res) => {
    try {

        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = req.query.page;  //Pagination
        }

        const limit = 3;
        const userData = await User.find({
            isAdmin : false,
            $or : [
                {name : {$regex : ".*" + search + ".*"}},   //Searching all user using name , email
                {email : {$regex : ".*" + search + ".*"}}
            ]
        })
        .limit(limit * 1)
        .skip((page-1)*limit)   //Image page=2, 2-1*(3) == 3, So skip first 3.
        .exec();   

        // Count total users
        const count = await User.find({
            isAdmin : false,
            $or : [
                {name : {$regex : ".*" + search + ".*"}},
                {email : {$regex : ".*" + search + ".*"}}
            ]
        }).countDocuments();


        // Render customer file with datas
        res.render("customers", {
            data : userData, 
            totalPages : Math.ceil(count / limit),
            currentPage : page
        });

        
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};




const blockCustomer = async (req, res) => {
    try {

        let id = req.query.id;
        await User.updateOne({_id : id}, {$set : {isBlock : true} });   //Updated block field
        res.redirect("/admin/users");

    } catch (error) {

        console.error("Error at Block customer", error);
        res.redirect("/admin/pageerror");
        
    }
};

// // Admin block using params
// const blockCustomer = async (req, res) => {
//     try {

//         let id = req.params.id;
//         console.log(id);
        
//         await User.updateOne({_id : id}, {$set : {isBlock : true} });   //Updated block field
//         res.redirect("/admin/users");

//     } catch (error) {

//         console.error("Error at Block customer", error);
//         res.redirect("/pageerror");
        
//     }
// };




const unblockCustomer = async (req,res) => {
    try {

        const id = req.query.id;
        await User.updateOne({_id : id}, {$set : {isBlock : false} });
        res.redirect("/admin/users")
        
    } catch (error) {
        
        console.error("Error at unblock customer", error);
        res.redirect("/admin/pageerror");
    }
}





module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer,
}