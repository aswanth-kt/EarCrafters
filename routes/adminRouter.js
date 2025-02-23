const express = require('express');
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const {adminAuth, userAuth} = require("../middlewares/auth");




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




module.exports = router;