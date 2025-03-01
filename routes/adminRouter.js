const express = require('express');
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const bannerController = require("../controllers/admin/bannerController");
const {userAuth, adminAuth} = require("../middlewares/auth");
const multer = require('multer');
const storage = require("../helpers/multer");
const uploads = multer({storage: storage});




// Error Management
router.get("/pageerror", adminController.pageError);


// Login Management
router.get("/login", adminController.loadLogin);

router.post("/login", adminController.login);

router.get("/", adminAuth, adminController.loadDashboard);

router.get("/logout", adminController.adminLogout)


// Customer Management
router.get("/users", adminAuth, customerController.customerInfo);

router.get("/blockCustomer", adminAuth, customerController. blockCustomer);

router.get("/unblockCustomer", adminAuth, customerController. unblockCustomer);


// Category Mnagement
router.get("/category", adminAuth, categoryController.categoryInfo);

router.post("/addCategory", adminAuth, categoryController.addCategory);

router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);

router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);

router.get("/listCategory", adminAuth, categoryController.getListCategory);

router.get("/unlistCategory", adminAuth, categoryController.getUnListCategory);

router.get("/editCategory", adminAuth, categoryController.getEditCategory);

router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

router.get("/deleteCategory/:id", adminAuth, categoryController.deleteCategory);


//Product Management
router.get("/addProducts", adminAuth, productController.getAddProduct);

router.post("/addProducts", adminAuth, uploads.array("images", 3), productController.addProducts);

router.get("/products", adminAuth, productController.getAllProducts);

router.post("/addProductOffer", adminAuth, productController.addProductOffer);

router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);

router.get("/blockProduct", adminAuth, productController.blockProduct);

router.get("/unblockProduct", adminAuth, productController.unblockProduct);

router.get("/editProduct", adminAuth, productController.getEditProduct);

router.post("/editProduct/:id", adminAuth, uploads.array("images" , 3), productController.editProduct);

router.post("/deleteImage", adminAuth, productController.deleteSingleImage);

router.get("/deleteProduct", adminAuth, productController.deleteProduct);


//Banner Management
router.get("/banner", adminAuth, bannerController.getBannerPage);

router.get("/addBanner", adminAuth, bannerController.getAddBannerPage);

router.post("/addBanner", adminAuth, uploads.single("images"), bannerController.addBanner);

router.get("/deleteBanner", adminAuth, bannerController.deleteBanner);






module.exports = router;