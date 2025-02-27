const Banner = require("../../models/bannerSchema");
const path = require('path');
const fs = require('fs');




//Load Banner page
const getBannerPage = async (req, res) => {
    try {

        const findBanner = await Banner.find({});

        res.render("banner", {data: findBanner});
        
    } catch (error) {
        
        console.error("Error in get banner page", error);
        res.redirect("/admin/pageerror");
        
    }
};



// Load Add Banner page
const getAddBannerPage = async (req, res) => {
    try {

        res.render("addBanner");
        
    } catch (error) {

        console.error("Error in get add banner page", error);
        res.redirect("/admin/pageerror");
        
    }
};




// Upload new banner
const addBanner = async (req, res) => {
    try {

        const data = req.body;
        const image = req.file;
        const newBanner = new Banner({
            image: image.filename,
            title: data.title,
            description: data.description,
            startDate: new Date(data.startDate+"T00:00:00"),
            endDate: new Date(data.endDate+"T00:00:00"),
            link: data.link,
        });
        await newBanner.save()
        .then((data) => console.log("Banner added: ", data));

        res.redirect("/admin/banner");
        
    } catch (error) {
        
        console.error("Error in Add banner", error);
        res.redirect("/admin/pageerror");
        
    }
};




const deleteBanner = async (req, res) => {
    try {

        const id = req.query.id;
        await Banner.findByIdAndDelete(id)
        .then((data) => console.log("Banner deleted: ", data));
        
        res.redirect("/admin/banner");
        
    } catch (error) {

        console.error("Error in delete banner", error);
        res.redirect("/admin/pageerror");
        
    };
};








module.exports = {
    getBannerPage,
    getAddBannerPage,
    addBanner,
    deleteBanner,
}