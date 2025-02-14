



const loadHomepage = async (req, res) => {
    try {

        return res.render("home");
        
    } catch (error) {

        console.log("Home page not found");
        res.status(500).send("Server error");
    }
};


const pageNotFound = async (req, res) => {
    try {

        res.status(404).render("page-404");
        
    } catch (error) {

        res.status(404).send("400 page Not Found");
    }
}



module.exports = {
    loadHomepage,
    pageNotFound,
}